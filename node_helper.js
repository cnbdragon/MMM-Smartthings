/* Magic Mirror
 * Node Helper: MMM-Smartthings
 *
 * By BuzzKC / CNBDragon
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const smartthings = require("smartthings-node");
let st;
let config;
let capabilities = [];
let deviceStatuses = [];

/*
	Capabilities statuses implemented:
	"switch"
	"contactSensor"
	"lock"
	"temperatureMeasurement"
	"relativeHumidityMeasurement"
	"motionSensor"

	Other capabilities reference: https://docs.smartthings.com/en/latest/capabilities-reference.html
*/

module.exports = NodeHelper.create({

	socketNotificationReceived: function(notification, payload) {
		if (notification === 'SEND_CONFIG') {
			this.config = payload;
			this.st = new smartthings.SmartThings(this.config.personalAccessToken);
			this.capabilities = this.config.capabilities;
		}

		if (notification === "GET_DEVICES") {
			if (this.capabilities) {
				this.deviceStatuses = [];
				for (let i = 0; i < this.capabilities.length; i++) {
					let capability = this.capabilities[i];
					this.getDevicesByCapability(capability);
				}
			}
		}
	},

	getDevicesByCapability: function(capability) {
		this.st.devices.listDevicesByCapability(capability).then(deviceList => {
				for (let i = 0; i < deviceList.items.length; i++) {
					let device = deviceList.items[i];
					this.getDeviceStatus(device, capability);
				}
			}, reason => {this.sendSocketNotification('ConsoleOutput', reason)}
		);
	},

	getDeviceStatus: function(device, capability) {
		this.st.devices.getDeviceCapabilityStatus(device.deviceId, "main", capability).then(deviceStatus => {

			let statusType = null;
			let statusType2 = null;
			switch (capability) {
				case 'switch':
					statusType = deviceStatus.switch.value;
					break;
				case 'contactSensor':
					statusType = deviceStatus.contact.value;
					break;
				case 'lock':
					statusType = deviceStatus.lock.value;
					break;
				case 'temperatureMeasurement':
					statusType = deviceStatus.temperature.value;
					break;
				case 'relativeHumidityMeasurement':
					statusType = deviceStatus.humidity.value;
					break;
				case 'motionSensor':
					statusType = deviceStatus.motion.value;
					break;
				case 'washerOperatingState':
					statusType = deviceStatus.machineState.value;
					statusType2 = deviceStatus.completionTime.value;
					today = new Date();
					date = new Date(statusType2);
					date = date - today;
					statusType2 = this.msToTime(date);
					break;
				case 'dryerOperatingState':
					statusType = deviceStatus.machineState.value;
					statusType2 = deviceStatus.completionTime.value;
					today = new Date();
					date = new Date(statusType2);
					date = date - today;
					statusType2 = this.msToTime(date);
					break;
				case 'dishwasherOperatingState': 
					statusType = deviceStatus.machineState.value;
					break;
				case 'ovenOperatingState': 
					statusType = deviceStatus.machineState.value;
					break;
				case 'doorControl':
					statusType = deviceStatus.door.value;
					break;
				case 'waterSensor':
					statusType = deviceStatus.water.value;
					break;

			}

			if (!this.isDeviceNameExcluded(device.label)) {
				this.deviceStatuses.push({
					"id": device.deviceId,
					"deviceName": device.label,
					"deviceTypeNAME": device.deviceTypeName,
					"deviceType": capability,
					"value": statusType,
					"value2": statusType2
				});

				this.sendSocketNotification('DEVICE_STATUS_FOUND', this.deviceStatuses);
			}
		}, reason => {this.sendSocketNotification('ConsoleOutput', reason)});
	},

	isDeviceNameExcluded: function(deviceName) {
		for (let i = 0; i < this.config.excludedDeviceNames.length; i++) {
			if (deviceName.includes(this.config.excludedDeviceNames[i])) {
				return true;
			}
		}
		return false;
	},

	msToTime: function(duration) {
		if(duration<0){
			duration = 0;
		}
  		const milliseconds = parseInt((duration % 1000) / 100),
    	seconds = Math.floor((duration / 1000) % 60),
    	minutes = Math.floor((duration / (1000 * 60)) % 60),
    	hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  		const hoursStr = (hours < 10) ? "0" + hours : hours;
  		const minutesStr = (minutes < 10) ? "0" + minutes : minutes;
  		const secondsStr = (seconds < 10) ? "0" + seconds : seconds;

  		return hoursStr + ":" + minutesStr;// + ":" + secondsStr + "." + milliseconds;
	}
});