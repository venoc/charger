const mongo = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/iota';
const storage = require('node-persist');
const { Observable } = require('rxjs');
const Iota = require('@iota/core');
const converter = require('@iota/converter');
const config = require(__dirname + '/config.json');
const iota = Iota.composeAPI({
	provider: 'http://' + config.iri.ip + ":" + config.iri.portAPI
});
const hash = require('object-hash');
let zmq = require('zeromq');
let tcp = 'tcp://' + config.iri.ip + ":" + config.iri.portZMQ;
const Mam = require('@iota/mam')
const { asciiToTrytes } = require('@iota/converter')
const { trytesToAscii } = require('@iota/converter')



class MyHub {
	constructor() {
		this.sock = zmq.socket('sub');
	}

	async init() {
		this.collection = await this.getCollection();
		return new Promise((res, rej) => {
			res("succ");
		})
	}

	listen(receivingAddress = null) {
		return new Observable((observer) => {
			console.log(receivingAddress)
			this.sock.connect(tcp);
			this.sock.subscribe('tx');
			this.sock.subscribe('sn');
			this.sock.on('message', msg => {

				const data = msg.toString().split(' ');
				if (receivingAddress == null) {
					observer.next(data);
				}
				else {
					var index = undefined;
					for (var i = 0; i < receivingAddress.length; i++) {
						if (data[2] == receivingAddress[i])
							index = i;
					}
					if (index != undefined)
						observer.next(data);
				}
			});
		});
	}

	async getMessageOfTransaction(hash) {
		return new Promise((res, rej) => {
			iota.getTrytes(hash)
				.then(trytes => {
					var ascii = converter.trytesToAscii(trytes[0].substring(0, 2186));
					ascii = ascii.toString().replace(/\0/g, '');
					res(ascii);
				})
				.catch(err => {
					rej(err);
				})

		});
	};

	async getBalanceOfSeed(seed) {
		//await this.getInputs();
		await this.checkIfPending(seed);
		let storage = await this.collection.findOne({ seed: seed });
		console.log(storage);
		let sum = 0;
		if(storage.receiving != null && storage.receiving.length > 0) {
			for(let i = 0; i < storage.receiving.length; i++) {
				let res = await this.getBalance(storage.receiving[i].address);
				storage.receiving[i].balance = res[0];
				sum += Number(storage.receiving[i].balance);
			}
		}
		if(storage.inputs != null && storage.inputs.length > 0) {
			for(let i = 0; i < storage.inputs.length; i++) {
				let res = await this.getBalance(storage.inputs[i].address);
				storage.inputs[i].balance = res[0];
				sum += Number(storage.inputs[i].balance);
			}
		}
		console.log(sum)
		return new Promise((res, rej) => {
			this.collection.updateOne({ seed: seed }, { '$set': { inputs: storage.inputs, balance: sum, receiving: storage.receiving } }, (err, result) => {
				res(sum);
			});
		});
	}

	async startMongo() {
		return new Promise((res, rej) => {
			mongo.connect(url, (err, client) => {
				if (err) {
					rej(err);
				} else {
					res(client);
				}
			});
		});
	};

	async getElementFromSeed(seed) {
		new Promise((res, rej) => {
			this.collection.find({ seed: seed }).toArray((err, items) => {
				res(item);
				rej(err);
			})
		});
	}

	async MAMInit(mamSecret) {
		let mamState = Mam.init('http://' + config.iri.ip + ':' + config.iri.portAPI);

		// We are using MAM restricted mode with a shared secret in this example
		let mamType = 'restricted';

		mamState = Mam.changeMode(mamState, mamType, mamSecret);
		//console.log(mamState);
		return new Promise((res, rej) => {
			res(JSON.stringify(mamState));
		});
	}
	async mamFetch(root, mamSecret) {
		const mamType = 'restricted'
		let mamState = Mam.init('http://' + config.iri.ip + ':' + config.iri.portAPI);
		mamState = Mam.changeMode(mamState, mamType, mamSecret);

		// Initialise MAM State
		//let mamState = Mam.init('http://' + config.iri.ip + ':' + config.iri.portAPI + '14265');

		// Callback used to pass data out of the fetch

		const resp = await Mam.fetch(root, mamType, mamSecret)
		return new Promise((res, rej) => {
			for(let i = 0; i < resp.messages.length; i++) {
				resp.messages[i] = converter.trytesToAscii(resp.messages[i]);
			}
			res(resp.messages);
		});

	}

	async mamSend(mamState2, data) {
		//console.log(mamState2)
		if (typeof (mamState2) == "string")
			mamState2 = JSON.parse(mamState2);
		let mamState = Mam.init('http://' + config.iri.ip + ':' + config.iri.portAPI);
		const mamType = 'restricted';
		const mamSecret = mamState2.channel.side_key;
		mamState = Mam.changeMode(mamState, mamType, mamSecret);
		// Convert the JSON to trytes and create a MAM message
		mamState = mamState2;


		let trytes = asciiToTrytes(data);

		//console.log(mamState);
		let message = Mam.create(mamState, trytes);
		//console.log(message.state);
		// Update the MAM state to the state of this latest message
		mamState = message.state;

		// Attach the message
		let array = await Mam.attach(message.payload, message.address, 3, config.mwm).catch(err => console.log(err));
		//console.log("array:",array);
		console.log('Sent message to the Tangle!', data);
		console.log('Address: ' + message.root);
		return new Promise((res, rej) => {
			res(JSON.stringify({ root: message.root, mamState: mamState }));
		});
	}

	async getInputs(seed) {
		let storage = await this.collection.findOne({ seed: seed });
		return new Promise((res, rej) => {
			let options = undefined;
			if (storage !== null && storage.inputs != null && storage.inputs.length > 0) {
				options = { start: storage.inputs[0].keyIndex, end: storage.inputs[storage.inputs.length - 1].keyIndex, treshold: 1 };
			}
			//console.log(options);
			console.time('getInputs');
			iota.getInputs(seed, options)
				.then(({ inputs, totalBalance }) => {
					console.timeEnd('getInputs');
					let index = 0;
					for (let input of inputs) {
						if (index < input.keyIndex)
							index = input.keyIndex;
					}
					if (storage == null) {
						this.collection.insertOne({
							seed: seed,
							inputs: inputs,
							balance: totalBalance,
							highestKeyIndex: index
						}, (err, result) => {
							rej(err);
							res(result);
						});
					} else {
						if (storage.inputs != null) {
							for (let oldInput of storage.inputs) {
								for (let i = 0; i < inputs.length; i++) {
									if (inputs[i].keyIndex == oldInput.keyIndex)
										inputs[i].used = oldInput.used;
								}
							}
						}
						if (storage.highestKeyIndex < index) {
							this.collection.updateOne({ seed: seed }, { '$set': { inputs: inputs, balance: totalBalance, highestKeyIndex: index } }, (err, result) => {
								rej(err);
								res(result);
							});
						} else {
							this.collection.updateOne({ seed: seed }, { '$set': { inputs: inputs, balance: totalBalance } }, (err, result) => {
								rej(err);
								res(result);
							});
						}

					}
					res(inputs);
				})
				.catch(err => {
					console.timeEnd('getInputs');
					rej(err);
				})
		});
	};

	async checkIfPending(seed) {
		let storage = await this.collection.findOne({ seed: seed });
		if (storage == null)
			storage = await this.getInputs(seed);
		return new Promise((res, rej) => {
			let tails = [];
			if (storage != null && storage.pending != undefined && storage.pending != null) {
				for (let pending of storage.pending)
					tails.push(pending.used);
			}
			iota.getLatestInclusion(tails).then(states => {
				for (let i = 0; i < tails.length; i++) {
					if (states[i] && storage.inputs != null && storage.inputs != undefined) {
						for (let j = 0; j < storage.inputs.length; j++) {
							if (storage.inputs[i].used === tails[i]) {
								storage.inputs.splice(j, j + 1);
							}
						}
						storage.pending[i].used = null;
						storage.inputs.push(storage.pending[i]);
						storage.pending.splice(i, i + 1);
					}
				}
				this.collection.updateOne({ seed: seed }, { '$set': { inputs: storage.inputs, pending: storage.pending } }, (error, result) => {
					res(result);
					rej(error);
				});
			}).catch(err => {
				console.log(err);
			});
		})
	};

	async getNewAddress(seed, start, t) {
		start = Number(start);
		return new Promise((res, rej) => {
			iota.getNewAddress(seed, { index: start, total: t })
				.then(addresses => res(addresses))
				.catch(err => rej(err))
		});
	};

	async getNewReceivingAddress(seed) {
		await this.checkIfPending(seed);
		let storage = await this.collection.findOne({ seed: seed });
		if (storage == null || storage.inputs == null)
			await this.getInputs(seed);
		storage.highestKeyIndex++;
		let address = await this.getNewAddress(storage.highestKeyIndex, 1);
		return new Promise((res, rej) => {
			if (storage.receiving == undefined)
				storage.receiving = [];
			storage.receiving.push({
				address: address[0],
				keyIndex: storage.highestKeyIndex,
				security: 2,
				balance: 0
			})
			this.collection.updateOne({ seed: seed }, { '$set': { highestKeyIndex: storage.highestKeyIndex, receiving: storage.receiving } }, (error, result) => {
				res(address);
				rej(error);
			});
		});
	}

	async transfer(seed, to, value, tag, message) {
		await this.checkIfPending(seed);
		let storage = await this.collection.findOne({ seed: seed });
		if (storage == null || storage.input == null) {
			await this.getInputs(seed);
			storage = await this.collection.findOne({ seed: seed });
		}
		storage.highestKeyIndex++;
		let remainderAddress = await this.getNewAddress(seed, storage.highestKeyIndex, 1);
		return new Promise((res, rej) => {
			if (seed.length != 81) {
				rej(new Error('Seed ist not 81 characters long'));
				return;
			}
			if (to.length != 81) {
				rej(new Error('Address ist not 81 characters long'));
				return;
			}
			if (value <= 0) {
				rej(new Error('Value must be higher than zero'));
				return;
			}
			tag = tag.toUpperCase();
			value = Number(value);
			let tmp = 0;
			let inputs = [];
			let used = [];
			if (storage.inputs == null) {
				rej(new Error('Insufficient Balance'));
				return;
			}
			if (storage !== undefined && storage != null && storage.inputs.length > 0) {
				let i = 0;
				while (value > tmp && i < storage.inputs.length) {
					if (storage.inputs[i].used == null && storage.inputs[i].used == undefined) {
						tmp += storage.inputs[i].balance;
						inputs.push({
							address: storage.inputs[i].address,
							keyIndex: storage.inputs[i].keyIndex,
							security: storage.inputs[i].security,
							balance: storage.inputs[i].balance
						});
						used.push(i);
					}
					i++;
				}
				if (tmp < value) {
					rej(new Error('Insufficient Balance'));
					return;
				}
			} else {
				rej(new Error('Something went wrong'));
				return;
			}
			const transfers = [{
				address: to,
				value: value, // 1Ki
				tag: tag, // optional tag of `0-27` trytes
				message: converter.asciiToTrytes(message) // optional message in trytes
			}];
			const depth = 3;
			const minWeightMagnitude = config.mwm;
			console.time('prepareTransfer');
			iota.prepareTransfers(seed, transfers, { inputs, remainderAddress: remainderAddress[0] })
				.then(trytes => {
					console.timeEnd('prepareTransfer');
					console.time('sendTrytes');
					return iota.sendTrytes(trytes, depth, minWeightMagnitude)
				}, err => { console.log("hi") })
				.then(bundle => {
					console.timeEnd('sendTrytes');
					let pending = [];
					for (let i of used)
						storage.inputs[i].used = bundle[0].hash;
					pending.push({
						address: bundle[bundle.length - 1].address,
						keyIndex: storage.highestKeyIndex,
						security: storage.inputs[inputs.length - 1].security,
						balance: bundle[bundle.length - 1].value,
						used: bundle[0].hash
					})
					this.collection.updateOne({ seed: seed }, { '$set': { inputs: storage.inputs, pending: pending, highestKeyIndex: storage.highestKeyIndex } }, (error, result) => {
						res(bundle[0].hash);
						rej(error);
					});
				})
				.catch(err => {
					rej(err);
				})
		});
	};

	async getBalance(address) {
		return new Promise((res, rej) => {
			iota.getBalances([address], 100)
				.then(({ balances }) => {
					res(balances);
				})
				.catch(err => {
					rej(err);
				});
		});
	}

	async getBalancesOfReceiving(seed) {
		let storage = await this.collection.findOne({ seed: seed });
		let addresses = [];
		return new Promise((res, rej) => {
			for (let address of storage.receiving)
				addresses.push(address.address);
			iota.getBalances(addresses, 100)
				.then(({ balances }) => {
					for (let i = 0; i < balances.length; i++) {
						storage.receiving[i].balance = balances[i];
					}
					this.collection.updateOne({ seed: seed }, { '$set': { receiving: storage.receiving } }, (error, result) => {
						res(balances);
						rej(error);
					});
				})
				.catch(err => {
					rej(err);
				})
		});
	}
	async getAccountData(seed) {
		let storage = await this.collection.findOne({ seed: seed });
		return new Promise((res, rej) => {
			res(storage);
		});
	}
	async getCollection() {
		let client = await this.startMongo().catch(err => console.log(err));
		let db = client.db('iota');
		let collection = db.collection('address');
		return new Promise((res, rej) => {
			res(collection);
		});
	}

	async moveFromReceivingToInput(seed, address) {
		await this.getBalancesOfReceiving();
		let storage = await this.collection.findOne({ seed: seed });
		return new Promise((res, rej) => {
			let index = undefined;
			for (let i = 0; i < storage.receiving.length; i++) {
				if (storage.receiving[i].address == address) {
					index = i;
					break;
				}
			}
			console.log("index", index, "value", storage.receiving[index], "address", address)
			let balance = storage.receiving[index].balance;
			if (balance > 0)
				storage.inputs.push(storage.receiving[index]);
			storage.receiving.splice(index, index + 1);
			console.log(storage);
			this.collection.updateOne({ seed: seed }, { '$set': { inputs: storage.inputs, receiving: storage.receiving } }, (error, result) => {
				res(balance);
				rej(error);
			});
		});

	}
}

module.exports = MyHub;
