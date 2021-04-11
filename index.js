module.exports = async ({port, mcast} = {}) => {
	const {PktIn, PktOutInfoRequest, PktOutStateSet} = require('./lib/pkt.js');

	function parsePkt (payload) {
		return PktIn.fromBuffer(payload);
	}

	const {Socket} = require('./lib/net.js')({parsePkt});

	const socket = new Socket();

	function setState (cpuid, id, val) {
		const pkt = new PktOutStateSet(cpuid);
		pkt.set(id, val);
		socket.send(pkt);
	}

	function requestInfo (cpuid) {
		const pkt = new PktOutInfoRequest(cpuid);
		socket.send(pkt);
	}

	const {DeviceStore} = require('./lib/devices.js')({setState, requestInfo});

	const devices = new DeviceStore();

	socket.on('pkt', (pkt) => devices.handlePkt(pkt));

	await socket.bind(port, mcast);

	return {
		on: devices.on.bind(devices),
		get: devices.get.bind(devices),
		getAll: devices.getAll.bind(devices)
	};
};
