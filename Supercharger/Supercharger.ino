
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include "index.h"
#include <ESP8266HTTPClient.h>

#define TRANSISTOR D3
#define period  1000
String node = "http://192.168.1.26:3000/api";
boolean toggle = false;
boolean state = false;
String seed = "SEEDB9999999999999999999999999999999999999999999999999999999999999999999999999999";
String index1 = "0"; 
unsigned long time_now = 0;
HTTPClient http;
// Replace with your network credentials
const char* ssid     = "SSID";
const char* password = "password";

String address = "0x000000000000000000";
int iotas  = 0;
int last_balance =  0; 

ESP8266WebServer server(80);
Adafruit_INA219 sensor219;
// Variable to store the HTTP request
String header;

const int scl =D2, sda = D1;
float busVoltage = 0; 
float current = 0; // Measure in milli amps
float power = 0;
void handleRoot() {
 String s = MAIN_page; //Read HTML contents
 server.send(200, "text/html", s); //Send web page
}
void handleCurrent() {
 current = sensor219.getCurrent_mA();
 if( abs(current) <= 1.0){
  current = 0; 
 }
 server.send(200, "text/plane", String(current)); 
}
void handleVoltage() {
 busVoltage = sensor219.getBusVoltage_V();
 server.send(200, "text/plane", String(busVoltage)); 
}
void handlePower() {
 power = busVoltage * (current/1000);
 server.send(200, "text/plane", String(power)); 
}
void handleAddress() {
 server.send(200, "text/plane", address); 
}
void handleIotas() {
 server.send(200, "text/plane", String(iotas)); 
}
void handleStatus() {
  if(state)
   server.send(200, "text/plane","OFF");
  else
   server.send(200, "text/plane","XXX"); 
}
void handleToggle(){
  Serial.println("Button pressed");
  if(!state){
    server.send(200, "text/plane","XXX");
    return; 
  }
  toggle = !toggle;
  digitalWrite(TRANSISTOR, toggle);
  if(toggle)
   server.send(200, "text/plane","ON");
  else
   server.send(200, "text/plane","OFF");
}
String sendGet(String req){
    http.begin(req);
    Serial.print("GET: ");
    Serial.println(req);
    int httpCode = http.GET();                                        
 
    if (httpCode > 0) { //Check for the returning code
 
        String payload = http.getString();
        Serial.println(httpCode);
        Serial.println(payload);
        return(payload);
      }
 
    else {
      Serial.println("Error on HTTP request");
      http.end();
      return("Error on HTTP request");  
    }
 
    http.end();
}
void service(){
    if(millis() > time_now + period){
        String req = node + "/getBalance?address="+address;
        int b = sendGet(req).toInt();
        if(b >  last_balance){
          iotas += b - last_balance;
          last_balance = b; 
          state = true;
          toggle = true;
        }
        time_now = millis();
        if(!toggle){
          if(iotas - abs(power) >= 0){
             iotas -= (int)(power+.5);
             state = true; 
             toggle = false;
            digitalWrite(TRANSISTOR, toggle);
          }
          else{
            state = false;
            toggle = true;
            digitalWrite(TRANSISTOR, toggle);
          }
        }
    }
}
void setup() {
  pinMode( 2, OUTPUT); 
  pinMode( TRANSISTOR, OUTPUT); 
  Serial.begin(115200);
  sensor219.begin();
  digitalWrite(2, HIGH); 
  digitalWrite(TRANSISTOR, LOW); 
  // Connect to Wi-Fi network with SSID and password
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  digitalWrite(2, LOW); 
  digitalWrite(TRANSISTOR, HIGH); 
  // Print local IP address and start web server
  Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);     
  server.on("/readCurrent", handleCurrent);
  server.on("/readPower", handlePower);
  server.on("/readVoltage", handleVoltage);
  server.on("/toggleButton", handleToggle);
  server.on("/getAddress", handleAddress);  
  server.on("/readStatus", handleStatus);
  server.on("/readIotas", handleIotas);
  server.begin();
  String req = node + "/getAddress?seed=" + seed + "&index="+ index1
  ;
  address = sendGet(req);  
  req = node + "/getBalance?address="+address ;
  last_balance = sendGet(req).toInt();  
}

void loop(){
  server.handleClient();
  service();
}
