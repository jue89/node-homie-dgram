const {Tagged, encode, decodeFirstSync} = require('cbor');
const assert = require('assert');

const FIELD_CPUID = 0;
const FIELD_UPTIME = 1;
const FIELD_SAUL = 2;

const TAG_INFO_REQUEST = 55;
const TAG_INFO_PUBLISH = 56;
const TAG_STATE_REQUEST = 57;
const TAG_STATE_PUBLISH = 58;
const TAG_STATE_SET = 59;

class PktOut {
	constructor (type, cpuid) {
		assert(typeof cpuid === 'string');
		this.cpuid = cpuid;
		this.payload = new Map();
		this.payload.set(FIELD_CPUID, Buffer.from(cpuid, 'hex'));
		this.pkt = new Tagged(type, this.payload);
	}

	toBuffer () {
		return encode(this.pkt);
	}
}

class PktOutInfoRequest extends PktOut {
	constructor (cpuid) {
		super(TAG_INFO_REQUEST, cpuid);
	}
}

class PktOutStateRequest extends PktOut {
	constructor (cpuid, saul) {
		super(TAG_STATE_REQUEST, cpuid);
		if (saul) this.payload.set(FIELD_SAUL, saul);
	}
}

class PktOutStateSet extends PktOut {
	constructor (cpuid) {
		super(TAG_STATE_SET, cpuid);
		this.devs = new Map();
		this.payload.set(FIELD_SAUL, this.devs);
	}

	set (id, values) {
		this.devs.set(id, [0, ...values]);
	}
}

class PktIn {
	static fromBuffer (buffer) {
		const pkt = decodeFirstSync(buffer, {tags});
		assert(pkt instanceof PktIn);
		return pkt;
	}

	constructor (payload) {
		assert(payload instanceof Map);
		this.cpuid = payload.get(FIELD_CPUID).toString('hex');
		this.uptime = payload.get(FIELD_UPTIME);
	}
}

class PktInInfoPublish extends PktIn {
	constructor (payload) {
		super(payload);
		this.saul = new Map();
		payload.get(FIELD_SAUL).forEach((value, key) => {
			const [name, type, readable, writable] = value;
			this.saul.set(key, {name, type, writable, readable});
		});
	}
}

class PktInStatePublish extends PktIn {
	constructor (payload) {
		super(payload);
		this.saul = new Map();
		payload.get(FIELD_SAUL).forEach((values, key) => {
			const scale = values.shift();
			values = values.map((v) => Math.pow(10, scale) * v);
			this.saul.set(key, values);
		});
	}
}

const tags = Object.fromEntries([
	[TAG_INFO_PUBLISH, (payload) => new PktInInfoPublish(payload)],
	[TAG_STATE_PUBLISH, (payload) => new PktInStatePublish(payload)]
]);

module.exports = {PktIn, PktInInfoPublish, PktInStatePublish, PktOutInfoRequest, PktOutStateRequest, PktOutStateSet};
