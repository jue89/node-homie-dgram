const assert = require('assert');
const {createSocket} = require('dgram');
const {EventEmitter} = require('events');

module.exports = ({parsePkt}) => {
	class Socket extends EventEmitter {
		constructor () {
			super();
			this.socket = createSocket('udp6');
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

		bind (port = 5001, mcast = 'ff02::cafe') {
			return new Promise((resolve) => {
				this.socket.bind(port, () => {
					this.socket.addMembership(mcast);
					resolve(port, mcast);
				});
			});
		}

		send (pkt) {
			const rinfo = this.rinfos.get(pkt.cpuid);
			assert(rinfo, 'Unknown destination');
			this.socket.send(pkt.toBuffer(), rinfo.port, rinfo.address);
		}

		close () {
			return new Promise((resolve) => {
				this.socket.close(resolve);
			});
		}
	}

	return {Socket};
};
