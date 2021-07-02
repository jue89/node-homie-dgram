const {
	PktIn,
	PktInInfoPublish,
	PktInStatePublish,
	PktOutInfoRequest,
	PktOutStateRequest,
	PktOutStateSet
} = require('../pkt.js');

function cborme (string) {
	const lines = string.join('').split('\n');
	const hex = lines.map((l) => l.replace(/#.*$/, '').replace(/[ \t]/g, '')).join('');
	return Buffer.from(hex, 'hex');
}

describe('PktIn', () => {
	const STATE_PUBLISH_RAW = cborme`
		D8 3A                             # tag(58)
		   A3                             # map(3)
		      00                          # unsigned(0)
		      4C                          # bytes(12)
		         0E801400164350573032362D # "\x0E\x80\x14\x00\x16CPW026-"
		      01                          # unsigned(1)
		      19 0C58                     # unsigned(3160)
		      02                          # unsigned(2)
		      A6                          # map(6)
		         00                       # unsigned(0)
		         83                       # array(3)
		            00                    # unsigned(0)
		            00                    # unsigned(0)
		            00                    # unsigned(0)
		         01                       # unsigned(1)
		         83                       # array(3)
		            01                    # unsigned(1)
		            02                    # unsigned(2)
		            03                    # unsigned(3)
		         02                       # unsigned(2)
		         83                       # array(3)
		            20                    # negative(0)
		            02                    # unsigned(2)
		            04                    # unsigned(4)
		         03                       # unsigned(3)
		         82                       # array(2)
		            00                    # unsigned(0)
		            00                    # unsigned(0)
		         04                       # unsigned(4)
		         82                       # array(2)
		            00                    # unsigned(0)
		            00                    # unsigned(0)
		         05                       # unsigned(5)
		         82                       # array(2)
		            00                    # unsigned(0)
		            00                    # unsigned(0)`;
	const STATE_PUBLISH_PKT = {
		cpuid: '0e801400164350573032362d',
		uptime: 3160,
		saul: new Map([
			[0, [0, 0]],
			[1, [20, 30]],
			[2, [0.2, 0.4]],
			[3, [0]],
			[4, [0]],
			[5, [0]]
		])
	};
	const INFO_PUBLISH_RAW = cborme`
		D8 38                                   # tag(56)
		   A3                                   # map(3)
		      00                                # unsigned(0)
		      4C                                # bytes(12)
		         0E801400164350573032362D       # "\x0E\x80\x14\x00\x16CPW026-"
		      01                                # unsigned(1)
		      19 0C3C                           # unsigned(3132)
		      02                                # unsigned(2)
		      BF                                # map(*)
		         00                             # unsigned(0)
		         84                             # array(4)
		            64                          # text(4)
		               42544E31                 # "BTN1"
		            71                          # text(17)
		               53454E53455F50554C53455F434F554E54 # "SENSE_PULSE_COUNT"
		            F5                          # primitive(21)
		            F4                          # primitive(20)
		         01                             # unsigned(1)
		         84                             # array(4)
		            64                          # text(4)
		               42544E32                 # "BTN2"
		            71                          # text(17)
		               53454E53455F50554C53455F434F554E54 # "SENSE_PULSE_COUNT"
		            F5                          # primitive(21)
		            F4                          # primitive(20)
		         02                             # unsigned(2)
		         84                             # array(4)
		            64                          # text(4)
		               42544E33                 # "BTN3"
		            71                          # text(17)
		               53454E53455F50554C53455F434F554E54 # "SENSE_PULSE_COUNT"
		            F5                          # primitive(21)
		            F4                          # primitive(20)
		         03                             # unsigned(3)
		         84                             # array(4)
		            64                          # text(4)
		               4C454431                 # "LED1"
		            6A                          # text(10)
		               4143545F44494D4D4552     # "ACT_DIMMER"
		            F5                          # primitive(21)
		            F5                          # primitive(21)
		         04                             # unsigned(4)
		         84                             # array(4)
		            64                          # text(4)
		               4C454432                 # "LED2"
		            6A                          # text(10)
		               4143545F44494D4D4552     # "ACT_DIMMER"
		            F5                          # primitive(21)
		            F5                          # primitive(21)
		         05                             # unsigned(5)
		         84                             # array(4)
		            64                          # text(4)
		               4C454433                 # "LED3"
		            6A                          # text(10)
		               4143545F44494D4D4552     # "ACT_DIMMER"
		            F5                          # primitive(21)
		            F5                          # primitive(21)
		         FF                             # primitive(*)`;
	const INFO_PUBLISH_PKT = {
		cpuid: '0e801400164350573032362d',
		uptime: 3132,
		saul: new Map([
			[0, {name: 'BTN1', type: 'SENSE_PULSE_COUNT', readable: true, writable: false}],
			[1, {name: 'BTN2', type: 'SENSE_PULSE_COUNT', readable: true, writable: false}],
			[2, {name: 'BTN3', type: 'SENSE_PULSE_COUNT', readable: true, writable: false}],
			[3, {name: 'LED1', type: 'ACT_DIMMER', readable: true, writable: true}],
			[4, {name: 'LED2', type: 'ACT_DIMMER', readable: true, writable: true}],
			[5, {name: 'LED3', type: 'ACT_DIMMER', readable: true, writable: true}]
		])
	};

	test('PktInStatePublish', () => {
		const pkt = PktIn.fromBuffer(STATE_PUBLISH_RAW);
		expect(pkt).toBeInstanceOf(PktInStatePublish);
		expect(pkt).toMatchObject(STATE_PUBLISH_PKT);
	});

	test('PktInInfoPublish', () => {
		const pkt = PktIn.fromBuffer(INFO_PUBLISH_RAW);
		expect(pkt).toBeInstanceOf(PktInInfoPublish);
		expect(pkt).toMatchObject(INFO_PUBLISH_PKT);
	});
});

describe('PktOut', () => {
	test('PktOutInfoRequest Broadcast', () => {
		const pkt = new PktOutInfoRequest();
		expect(pkt.toBuffer()).toEqual(cborme`
			D8 37           # tag(55)
			   A0           # map(0)
		`);
	});

	test('PktOutInfoRequest', () => {
		const pkt = new PktOutInfoRequest('CAFFEE');
		expect(pkt.toBuffer()).toEqual(cborme`
			D8 37           # tag(55)
			   A1           # map(1)
			      00        # unsigned(0)
			      43        # bytes(3)
			         CAFFEE # "\xCA\xFF\xEE"
		`);
	});

	test('PktOutStateRequest', () => {
		const pktAll = new PktOutStateRequest('CAFFEE');
		expect(pktAll.toBuffer()).toEqual(cborme`
			D8 39           # tag(57)
			   A1           # map(1)
			      00        # unsigned(0)
			      43        # bytes(3)
			         CAFFEE # "\xCA\xFF\xEE"
		`);
		const pktSelected = new PktOutStateRequest('CAFFEE', [1, 4]);
		expect(pktSelected.toBuffer()).toEqual(cborme`
			D8 39           # tag(57)
			   A2           # map(2)
			      00        # unsigned(0)
			      43        # bytes(3)
			         CAFFEE # "\xCA\xFF\xEE"
			      02        # unsigned(2)
			      82        # array(2)
			         01     # unsigned(1)
			         04     # unsigned(4)	 
		`);
	});

	test('PktOutStateSet', () => {
		const pkt = new PktOutStateSet('CAFFEE');
		expect(pkt.cpuid).toEqual('CAFFEE');
		pkt.set(1, [1, 2, 3]);
		expect(pkt.toBuffer()).toEqual(cborme`
			D8 3B           # tag(59)
			   A2           # map(2)
			      00        # unsigned(0)
			      43        # bytes(3)
			         CAFFEE # "\xCA\xFF\xEE"
			      02        # unsigned(2)
			      A1        # map(1)
			         01     # unsigned(1)
			         84     # array(4)
			            00  # unsigned(0)
			            01  # unsigned(1)
			            02  # unsigned(2)
			            03  # unsigned(3)
		`);
	});
});
