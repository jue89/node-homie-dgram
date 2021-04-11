const {EventEmitter} = require('events');
const assert = require('assert');

function arrEqual (a, b) {
	if (a.length !== b.length) return false;
	return a.every((x, n) => x === b[n]);
}

module.exports = ({setState, requestInfo}) => {
	class Item extends EventEmitter {
		constructor (device, id) {
			super();
			this.device = device;
			this.id = id;
			this.val = [];
		}

		_updateInfo (info) {
			Object.assign(this, info);
		}

		_updateValue (newVal) {
			const oldVal = this.val;
			this.emit('update', newVal);
			if (arrEqual(oldVal, newVal)) return;
			this.val = newVal;
			this.emit('change', newVal, oldVal);
		}

		get () {
			assert(this.readable);
			return this.val;
		}

		_set (val) {
			setState(this.device.cpuid, this.id, val);
			return new Promise((resolve) => {
				// If the endpoint isn't readbale at all, jsut assume
				// the set request has been processed successfully.
				if (!this.readable) return resolve(true);

				const to = setTimeout(() => resolve(false), 1000);
				this.once('update', (newVal) => {
					clearTimeout(to);
					resolve(arrEqual(val, newVal));
				});
			});
		}

		async set (val) {
			assert(this.writable);
			if (!Array.isArray(val)) val = [val];
			if (arrEqual(val, this.val)) return;
			for (let i = 0; i < 3; i++) {
				if (await this._set(val)) return;
			}
			throw new Error('Timeout');
		}

		toString () {
			return `${this.name}=[${this.val.join(', ')}] (ID=${this.id} TYPE=${this.type})`;
		}
	}

	class Device extends EventEmitter {
		constructor (cpuid) {
			super();
			this.cpuid = cpuid;
			this.isDefined = false;
			this.saul = new Map();
			this.saulByName = new Map();
		}

		_getOrCreateItem (id) {
			if (!this.saul.has(id)) {
				this.saul.set(id, new Item(this, id));
			}
			return this.saul.get(id);
		}

		_handlePkt (pkt) {
			this.uptime = pkt.uptime;
			if (pkt.constructor.name === 'PktInInfoPublish') {
				pkt.saul.forEach((info, id) => {
					const saul = this._getOrCreateItem(id);
					saul._updateInfo(info);
					this.saulByName.set(saul.name, saul);
				});
				if (!this.isDefined) {
					this.isDefined = true;
					this.emit('active', this);
				}
			} else if (pkt.constructor.name === 'PktInStatePublish') {
				pkt.saul.forEach((value, id) => {
					this._getOrCreateItem(id)._updateValue(value);
				});
				if (!this.isDefined) {
					requestInfo(this.cpuid);
				}
			}
		}

		get (name) {
			if (name === undefined) {
				return [...this.saulByName.values()];
			} else {
				const saul = this.saulByName.get(name);
				assert(saul, 'Unknown SAUL endpoint');
				return saul;
			}
		}

		toString () {
			const saul = [...this.saul.values()].map((s) => s.name);
			return `CPUID=${this.cpuid} UPTIME=${this.uptime}ms DEVICES=[${saul.join(', ')}]`;
		}
	}

	class DeviceStore extends EventEmitter {
		constructor () {
			super();
			this.devices = new Map();
		}

		_getOrCreate (cpuid) {
			if (!this.devices.has(cpuid)) {
				const device = new Device(cpuid);
				device.once('active', () => this.emit('discover', device));
				this.devices.set(cpuid, device);
			}
			return this.devices.get(cpuid);
		}

		handlePkt (pkt) {
			const device = this._getOrCreate(pkt.cpuid);
			device._handlePkt(pkt);
		}

		async get (cpuid, timeout = 20000) {
			return new Promise((resolve, reject) => {
				const device = this._getOrCreate(cpuid);
				if (device.isDefined) return resolve(device);
				const to = setTimeout(() => reject(new Error('Timeout')), timeout);
				device.once('active', () => {
					clearTimeout(to);
					resolve(device);
				});
			});
		}

		getAll () {
			return [...this.devices.values()].filter((d) => d.isDefined);
		}
	}

	return {DeviceStore, Device, Item};
};
