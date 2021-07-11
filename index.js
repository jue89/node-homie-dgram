module.exports = async ({port, mcast, iface} = {}) => {
	const {PktIn, PktOutStateRequest, PktOutInfoRequest, PktOutStateSet} = require('./lib/pkt.js');

	function parsePkt (payload) {
		return PktIn.fromBuffer(payload);
	}

	const {Socket, getIfacesWithIPv6} = require('./lib/net.js')({parsePkt});

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

	function triggerDiscovery ({port, mcast, discoverIface} = {}) {
		if (iface) discoverIface = iface;
		if (discoverIface === undefined) {
			const ifaces = Object.keys(getIfacesWithIPv6());
			ifaces.forEach((discoverIface) => triggerDiscovery({port, mcast, discoverIface}));
		} else {
			const pkt = new PktOutStateRequest();
			socket.send(pkt, {port: port || 5000, address: `${mcast || 'ff02::1'}%${discoverIface}`});
		}
	}

	const {DeviceStore} = require('./lib/devices.js')({setState, requestInfo});

	const devices = new DeviceStore();

	socket.on('pkt', (pkt) => devices.handlePkt(pkt));

	await socket.bind({port, mcast, iface});

	return {
		triggerDiscovery,
		on: devices.on.bind(devices),
		get: devices.get.bind(devices),
		getAll: devices.getAll.bind(devices),
		close: socket.close.bind(socket)
	};
};
