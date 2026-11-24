import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { clone as cloneSkeleton } from '../vendor/addons/SkeletonUtils.js';
import { MeshoptDecoder } from '../vendor/addons/meshopt_decoder.module.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

const BufferGeometryUtils = { mergeGeometries };
const THREE_GLOBAL = { ...THREE, BufferGeometryUtils };
Object.assign(globalThis, { THREE: THREE_GLOBAL, GLTFLoader, cloneSkeleton, MeshoptDecoder, BufferGeometryUtils, mergeGeometries });

const chunks = ["app/01-config-fleet.js","app/02-assyut-map.js","app/03-engine-assets.js","app/04-world-city.js","app/05-vehicles-life.js","app/06-gameplay-ui.js"];
const vTag = 1795551628658;
for (const src of chunks) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src + '?v=' + vTag;
    s.onload = resolve;
    s.onerror = () => reject(new Error('تعذر تحميل ' + src));
    document.head.appendChild(s);
  });
}
