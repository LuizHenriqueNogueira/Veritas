import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
afterEach(()=>{cleanup();localStorage.clear();});
window.matchMedia=((media:string)=>({matches:false,media,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return true;}})) as typeof window.matchMedia;
