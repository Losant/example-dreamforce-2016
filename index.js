var async = require('async');
var SensorTag = require('sensortag');
var gpio = require('rpi-gpio');
var Gateway = require('losant-mqtt').Gateway;

async.parallel([
  gpio.setup.bind(gpio, 11, gpio.DIR_OUT),
  gpio.setup.bind(gpio, 13, gpio.DIR_OUT),
  gpio.setup.bind(gpio, 15, gpio.DIR_OUT)
], function() {
  gpio.write(11, true); // red
  gpio.write(13, true); // green
  gpio.write(15, true); // blue
});

var gateway = new Gateway({
  id: 'my-device-id',
  key: 'my-access-key',
  secret: 'my-access-secret'
});

gateway.connect();

var peripheral = gateway.addPeripheral('57f16d00965fcf0100bec72f');

gateway.on('command', function(command) {

  console.log(command);
  
  if(command.name === 'color') {

    switch(command.payload.color) {
      case 'red':
        gpio.write(13, true);
        gpio.write(15, true);
        gpio.write(11, false);
        break;
      case 'green':
        gpio.write(11, true); // red
        gpio.write(15, true); // green
        gpio.write(13, false);
        break;
      case 'blue':
        gpio.write(11, true);
        gpio.write(13, true);
        gpio.write(15, false);
        break;
    }
  }
});

SensorTag.discoverById('a0e6f8aeb400', function(sensorTag) {

  async.series([
    sensorTag.connectAndSetup.bind(sensorTag),
    sensorTag.enableIrTemperature.bind(sensorTag),
    sensorTag.setIrTemperaturePeriod.bind(sensorTag, 1000),
    sensorTag.enableAccelerometer.bind(sensorTag),
    sensorTag.setAccelerometerPeriod.bind(sensorTag, 1000),
    sensorTag.enableHumidity.bind(sensorTag),
    sensorTag.setHumidityPeriod.bind(sensorTag, 1000),
    sensorTag.enableLuxometer.bind(sensorTag),
    sensorTag.setLuxometerPeriod.bind(sensorTag, 1000)
    
  ], function(err) {

    if(err) {
      console.log(err);
    } else {
      readValues(sensorTag);
    }
  });

});

var readValues = function(sensorTag) {

  async.forever(
    function(next) {
      async.series([
        sensorTag.readIrTemperature.bind(sensorTag),
        sensorTag.readAccelerometer.bind(sensorTag),
        sensorTag.readHumidity.bind(sensorTag),
        sensorTag.readLuxometer.bind(sensorTag)
      ], function(err, result) {
        if(err) {
          return next(err);
        } else {
          
          var state = {
            objectTemp: result[0][0],
            ambientTemp: result[0][1],
            accelX: result[1][0],
            accelY: result[1][1],
            accelZ: result[1][2],
            temperature: result[2][0],
            humidity: result[2][1],
            lux: result[3]
          };

          console.log('Reporting State: ');
          console.log(state);
          peripheral.sendState(state);
          
          setTimeout(next, 2000);
        }
      })
    },
    function(err) {
      console.log(err);
    });
};
