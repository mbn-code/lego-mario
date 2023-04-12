// @ts-check

// LegoHandsetDriver
// Tested with The LEGO 88010 Handset/Remote One on Linux
//
// Reads keys and dispatches x, y, z translations
//

const SUBSCRIBE_ACCEL = new Uint8Array([0x0a,0x00,0x41,0x00,0x00,0x05,0x00,0x00,0x00,0x01]);
const SUBSCRIBE_RGB   = new Uint8Array([
    0x0a,
    0x00,
    0x41, /* Port Input Single */
    0x01, /* Port ID */
    0x00, /* Mode */
    0x05, 0x00, 0x00, 0x00, /* Delta interval */
    0x01 /* Enabled */
]);

const MSG_TYPE_SINGLE_VALUE = 0x45;

const PORT_ACCEL = 0;
const PORT_CAMERA = 1;

export const LegoMarioDriver = new class extends EventTarget {
    #device // Just allow one device, for now
    #writeCharacteristic

    constructor() {
        super();

        this._onData = this._onData.bind(this);
    }

    async openDevice(device) {
        // if already connected to a device - close it
        if (this.#device) {
            this.disconnect();
        }

        const server = await device.gatt.connect();

        device.ongattserverdisconnected = e => this._disconnected(e);

        await this._startNotifications(server);

        this.#writeCharacteristic = await this._getWriteCharacteristic(server);

        await this._initButtons();

        console.log('Opened device: ', device);

        this.#device = device;
        this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));
    }

    async _startNotifications(server) {
        const service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123');
        const characteristic = await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123');
        characteristic.addEventListener('characteristicvaluechanged', this._onData);
        return characteristic.startNotifications();
    }

    async _getWriteCharacteristic(server) {
        const service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123');
        return await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123');
    }

    async _initButtons() {
        await this.#writeCharacteristic.writeValue(SUBSCRIBE_ACCEL);
        await this.#writeCharacteristic.writeValue(SUBSCRIBE_RGB);
    }

    disconnect() {
        this.#device?.gatt?.disconnect();
        this.#device = undefined;
    }

    _disconnected(evt) {
        this.dispatchEvent(new Event('disconnect'));
    }

    async scan() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['00001623-1212-efde-1623-785feabcd123'] }]
        });

        if (device) {
            await this.openDevice(device);
        }
    }

    _onData(event) {
        const target = event.target;

        const data = new Uint8Array(target.value.buffer)

        const len = data[0];
        const msg_type = data[2];

        if (msg_type === MSG_TYPE_SINGLE_VALUE) {
            const port = data[3];
            if (port === PORT_ACCEL) {
                const xlate = {
                    x: +target.value.getInt8(4),
                    y: +target.value.getInt8(5),
                    z: +target.value.getInt8(6)                
                }
    
                this.dispatchEvent(new CustomEvent('translate', {
                    detail: xlate
                }));
            } else if (port === PORT_CAMERA) {
                if (len === 8) { // Mode 0, 2x16bit IDX
                    const barcodeidx = +target.value.getUint16(4, true);
                    const coloridx = +target.value.getUint16(6, true);

                    const data = {};

                    if (barcodeidx != 0xffff) {
                        console.log(`Barcode: 0x${barcodeidx.toString(16)}`);
                        data.barcodeidx = barcodeidx;
                    }

                    if (coloridx != 0xffff) {
                        console.log(`Color: 0x${coloridx.toString(16)}`);
                        data.coloridx = coloridx;
                    }

                    this.dispatchEvent(new CustomEvent('camera', {detail: data}));
                    
                    } else if (len === 7) { // Mode 1, 3x8bit RGB
                    console.log(data);
                }
            } else {
                console.log(data);
            }
    
        }
        // console.log(data);

    }
}
