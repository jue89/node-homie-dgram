const assert = require('assert');
const os = require('os');
const {createSocket} = require('dgram');
const {EventEmitter} = require('events');

function getIfacesWithIPv6 () {
	const allIfaces = Object.entries(os.networkInterfaces());
	const v6Ifaces = allIfaces
		.map(([iface, addresses]) => [iface, addresses.find(({address}) => address.startsWith('fe80:'))])
		.filter(([iface, info]) => info !== undefined)
		.map(([iface, info]) => [iface, info.address.includes('%') ? info.address : info.address + '%' + iface]);
	return Object.fromEntries(v6Ifaces);
}

module.exports = ({parsePkt}) => {
	class Socket extends EventEmitter {
		constructor () {
			super();
			this.socket = createSocket({
				type: 'udp6',
				reuseAddr: true
			});
			this.rinfos = new Map();
			this.socket.on('message', (payload, rinfo) => {
				try {
					const pkt = parsePkt(payload);
					this.rinfos.set(pkt.cpuid, rinfo);
					this.emit('pkt', pkt);
				} catch (err) {
					this.emit('clientError', err, rinfo);
				}
			});
		}

		bind ({port, mcast, iface} = {}) {
			return new Promise((resolve) => {
				const ifaces = getIfacesWithIPv6();
				if (iface) {
					assert(ifaces[iface], `Unknown interface or interface has no link-local address: ${iface}`);
					this.iface = iface;
				}

				if (!mcast) mcast = 'ff02::cafe';
				if (!port) port = 5001;

				this.socket.bind(port, () => {
					if (iface) {
						this.socket.addMembership(mcast, ifaces[iface]);
					} else {
						Object.values(ifaces).forEach((address) => {
							this.socket.addMembership(mcast, address);
						});
					}
					resolve(port, mcast);
				});
			});
		}

		send (pkt, rinfo) {
			if (!rinfo) rinfo = this.rinfos.get(pkt.cpuid);
			assert(rinfo, 'Unknown destination');
			this.socket.send(pkt.toBuffer(), rinfo.port, rinfo.address);
		}

		close () {
			// Just return if the socket has been closed before
			if (!this.socket) return Promise.resolve();

			// Get socket handle and remove it from the instance
			const socket = this.socket;
			delete this.socket;

			return new Promise((resolve) => {
				socket.close(resolve);
			});
		}
	}

	return {getIfacesWithIPv6, Socket};
};
