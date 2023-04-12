// @ts-check
import { Demo3DObj } from './demo-3dobj.js';
import { LegoMarioDriver } from './lego-mario-driver.js';

export class MainApp extends HTMLElement {
    /** @type {Demo3DObj | null} */ #obj
    #cells

    constructor() {
        super();

        this.#cells = [];

        this.handleTranslate = this.handleTranslate.bind(this);
        this.handleCamera = this.handleCamera.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    connectedCallback() {
        this.innerHTML = `
        <style>
        #list {
            display: grid;
            grid-template-columns: 1fr 3fr;
            width: 600px;
        }

        </style>

        <h1>LEGO Mario/Luigi/Peach Demo</h1>
        <button id='connect'>CONNECT</button>
        <h2>Status: <span id='status'> - </span></h2>
        <h3>Camera: <span id='camera'> - </span></h3> 
        <div id='list'></div>
        <demo-3dobj></demo-3dobj>
        `;


        this.#obj = this.querySelector('demo-3dobj');
        this.querySelector('#connect').addEventListener('click', this.doScan);

        this._initList();

        LegoMarioDriver.addEventListener('connect', this.handleConnect);
        LegoMarioDriver.addEventListener('disconnect', this.handleDisconnect);
        LegoMarioDriver.addEventListener('translate', this.handleTranslate);
        LegoMarioDriver.addEventListener('camera', this.handleCamera);
    }

    disconnectedCallback() {
        LegoMarioDriver.removeEventListener('connect', this.handleConnect);
        LegoMarioDriver.removeEventListener('disconnect', this.handleDisconnect);
        LegoMarioDriver.removeEventListener('translate', this.handleTranslate);
        LegoMarioDriver.removeEventListener('camera', this.handleCamera);
    }

    _initList() {
        const list = this.querySelector('#list');
        const labels = ['X', 'Y', 'Z'];

        labels.forEach(l => {
            const label = document.createElement('span');
            label.classList.add('label');
            label.innerText = l;

            const value = document.createElement('span');
            value.classList.add('value');
            value.innerText = `-`;
            this.#cells.push(value);

            list.append(label, value);
        });
    }

    setStatus(str) {
        this.querySelector('#status').innerHTML = str;
    }

    handleCamera(/** @type {CustomEvent} */ evt) {
        const {barcodeidx, coloridx} = evt.detail;

        const el = this.querySelector('#camera');

        let str = '';
        if (barcodeidx) {
            str += `Barcode(0x${barcodeidx.toString(16)}) `;
        }

        if (coloridx !== undefined) {
            str += 'Color(';
            switch (coloridx) {
                case 0x13: str += 'white'; break;
                case 0x15: str += 'red'; break;
                case 0x17: str += 'blue'; break;
                case 0x18: str += 'yellow'; break;
                case 0x1a: str += 'black'; break;
                case 0x25: str += 'green'; break;
                case 0x6a: str += 'brown'; break;
                case 0x0c: str += 'purple'; break;
                case 0x38: str += 'brown'; break;
                case 0x42: str += 'cyan'; break;
                default: str += 'unknown';
            }
            str += ')';
        }

        el.innerHTML = str;
    }

    setCellValue(i, val) {
        this.#cells[i].innerText = val;
    }

    doScan() {
        LegoMarioDriver.scan();
    }

    handleTranslate(/** @type {CustomEvent} */ evt) {
        const {x, y, z} = evt.detail;
        this.#obj.setTranslation(x, y, -z);
        this.setCellValue(0, x);
        this.setCellValue(1, y);
        this.setCellValue(2, z);
    }

    handleConnect(/** @type {CustomEvent} */ evt) {
        const {device} = evt.detail;
        this.setStatus(`${device.name} connected`);
    }

    handleDisconnect() {
        this.setStatus(` - `);
    }
}
customElements.define('main-app', MainApp);
