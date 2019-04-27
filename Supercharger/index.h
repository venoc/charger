const char MAIN_page[] PROGMEM = R"=====(
<!DOCTYPE html>
<html>
<body>

<div id="demo">
<h1 align="center">Supercharger</h1>
  <br>
  <p align="center" style="color:grey;font-size: 1.5em;">Receiving Address:</p>
  <p  align="center" id="address" style="color:grey;font-size: 1.2em;"></p><br>
	<!--<button type="button" onclick="sendData(1)">LED ON</button>-->
</div>
<br> 
<div align="center" style="font-size: 1.5em;">
  <p >Iota Balance: <span id="iotas" style="color:brown;">0</span>i</p><br>
	<p>Charging Current: <span id="current" style="color:red;">0</span> mA</p><br>
  <p >Charging Voltage: <span id="voltage" style="color:green;">0</span> V</p><br>
  <p>Output power: <span id="power" style="color:blue;">0</span> W</p>
</div>
<div align="center" style="font-size: 1.5em;">
  <br>
  <button id="button" onclick="toggleButton()" style="background-color: #195B6A; border: none; color: white; padding: 24px 80px;">OFF</button>
</div>
<script>
window.onload = function () {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("address").innerHTML =
      this.responseText;
    }}
    xhttp.open("GET", "getAddress", true);
    xhttp.send();
}
setInterval(function() {
  // Call a function repetatively with 2 Second interval
  getData();
  getPower();
  getVoltage(); 
  getIotaBalance();
  getState();
}, 2000); //2000mSeconds update rate

function getData() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("current").innerHTML =
      this.responseText;
    }
  };
  xhttp.open("GET", "readCurrent", true);
  xhttp.send();
}
function getVoltage() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("voltage").innerHTML =
      this.responseText;
    }
  };
  xhttp.open("GET", "readVoltage", true);
  xhttp.send();
}
function getPower() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("power").innerHTML =
      this.responseText;
    }
  };
  xhttp.open("GET", "readPower", true);
  xhttp.send();
}
function getIotaBalance() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("iotas").innerHTML =
      this.responseText;
    }
  };
  xhttp.open("GET", "readIotas", true);
  xhttp.send();
}
function getState() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      if(this.responseText == "XXX"){
        document.getElementById("button").innerHTML = this.responseText;
      }
    }
  };
  xhttp.open("GET", "readStatus", true);
  xhttp.send();
}
function toggleButton() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("button").innerHTML = this.responseText;
    }
  };
  xhttp.open("GET", "toggleButton", true);
  xhttp.send();
}
</script>
<br>
</body>
</html>
)=====";
