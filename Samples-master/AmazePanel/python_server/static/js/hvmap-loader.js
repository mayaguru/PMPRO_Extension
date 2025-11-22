/**
 * HVMap Loader for Canon Lens Distortion Correction
 * 
 * Loads HVMap binary files (Cannon_L.hvmap, Cannon_R.hvmap) and converts them to WebGL textures
 * 
 * HVMap file format:
 * - Header: "HVMAP" (5 bytes)
 * - Version: uint16 (2 bytes)
 * - Width: uint32 (4 bytes)
 * - Height: uint32 (4 bytes)
 * - Compression: uint8 (1 byte) - 0=full precision, 1=half precision
 * - Data: Width * Height * 2 * sizeof(float) bytes (X and Y maps)
 */

import * as THREE from '../vendor/three/three.module.js';

/**
 * Load HVMap file and return map data as textures
 * @param {string} hvmapPath - Path to HVMap file
 * @returns {Promise<{mapX: THREE.DataTexture, mapY: THREE.DataTexture, width: number, height: number}>}
 */
export async function loadHVMap(hvmapPath) {
    try {
        console.log(`📂 Loading HVMap from: ${hvmapPath}`);
        
        const response = await fetch(hvmapPath);
        if (!response.ok) {
            throw new Error(`Failed to load HVMap: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const view = new DataView(arrayBuffer);
        
        let offset = 0;
        
        // Read magic header "HVMAP"
        const magic = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 5));
        offset += 5;
        
        if (magic !== 'HVMAP') {
            throw new Error(`Invalid HVMap file format: expected "HVMAP", got "${magic}"`);
        }
        
        // Read version
        const version = view.getUint16(offset, true); // little-endian
        offset += 2;
        
        if (version !== 1) {
            throw new Error(`Unsupported HVMap version: ${version} (expected 1)`);
        }
        
        // Read dimensions
        const width = view.getUint32(offset, true);
        offset += 4;
        const height = view.getUint32(offset, true);
        offset += 4;
        
        if (width <= 0 || height <= 0 || width > 10000 || height > 10000) {
            throw new Error(`Invalid HVMap dimensions: ${width}x${height}`);
        }
        
        // Read compression flag
        const compression = view.getUint8(offset);
        offset += 1;
        
        console.log(`📐 HVMap info: ${width}x${height}, compression=${compression}, version=${version}`);
        
        // Read UV data
        const mapXData = new Float32Array(width * height);
        const mapYData = new Float32Array(width * height);
        
        if (compression === 1) {
            // Half-precision (16-bit)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const u_half = view.getUint16(offset, true);
                    offset += 2;
                    const v_half = view.getUint16(offset, true);
                    offset += 2;
                    
                    // Convert from 16-bit to normalized float
                    mapXData[y * width + x] = u_half / 65535.0;
                    mapYData[y * width + x] = v_half / 65535.0;
                }
            }
        } else {
            // Full precision (32-bit float)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    mapXData[y * width + x] = view.getFloat32(offset, true);
                    offset += 4;
                    mapYData[y * width + x] = view.getFloat32(offset, true);
                    offset += 4;
                }
            }
        }
        
        // Create WebGL textures
        const mapXTexture = new THREE.DataTexture(
            mapXData,
            width,
            height,
            THREE.RedFormat,
            THREE.FloatType
        );
        mapXTexture.needsUpdate = true;
        mapXTexture.minFilter = THREE.LinearFilter;
        mapXTexture.magFilter = THREE.LinearFilter;
        mapXTexture.wrapS = THREE.ClampToEdgeWrapping;
        mapXTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        const mapYTexture = new THREE.DataTexture(
            mapYData,
            width,
            height,
            THREE.RedFormat,
            THREE.FloatType
        );
        mapYTexture.needsUpdate = true;
        mapYTexture.minFilter = THREE.LinearFilter;
        mapYTexture.magFilter = THREE.LinearFilter;
        mapYTexture.wrapS = THREE.ClampToEdgeWrapping;
        mapYTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        console.log(`✅ HVMap loaded successfully: ${width}x${height}`);
        
        return {
            mapX: mapXTexture,
            mapY: mapYTexture,
            width: width,
            height: height
        };
        
    } catch (error) {
        console.error(`❌ Failed to load HVMap from ${hvmapPath}:`, error);
        throw error;
    }
}

/**
 * Load both Left and Right HVMap files
 * @param {string} hvmapLPath - Path to Cannon_L.hvmap
 * @param {string} hvmapRPath - Path to Cannon_R.hvmap
 * @returns {Promise<{left: {mapX, mapY, width, height}, right: {mapX, mapY, width, height}}>}
 */
export async function loadHVMapLR(hvmapLPath, hvmapRPath) {
    const [left, right] = await Promise.all([
        loadHVMap(hvmapLPath),
        loadHVMap(hvmapRPath)
    ]);
    
    console.log(`✅ Loaded both HVMap files: L=${left.width}x${left.height}, R=${right.width}x${right.height}`);
    
    return { left, right };
}

console.log('✅ HVMap Loader module loaded');

