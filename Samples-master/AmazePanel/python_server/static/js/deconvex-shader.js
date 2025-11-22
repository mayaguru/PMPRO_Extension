/**
 * DeConvex Lens Distortion Correction Shader
 * Converts convex (fisheye-like) distorted equirectangular SBS video to flat
 * 
 * Based on DeConvex algorithm using lens curvature lookup table
 */

import * as THREE from '../vendor/three/three.module.js';
import { DECONVEX_COEFFICIENTS, DECONVEX_METADATA } from '../presets/deconvex_lens.js';

/**
 * Create DeConvex Shader Material for Three.js
 * @param {THREE.Texture} videoTexture - Video texture to apply distortion correction
 * @param {Object} options - Configuration options
 * @returns {THREE.ShaderMaterial}
 */
export function createDeconvexShaderMaterial(videoTexture, options = {}) {
    const {
        srcWidth = 7680,        // Source video width (8K SBS)
        srcHeight = 3840,       // Source video height
        outWidth = 10240,       // Output target width (12K)
        outHeight = 5120,       // Output target height
        enableDeconvex = true,  // Enable/disable correction
        interpolation = 'linear', // 'linear' or 'cubic' (future)
        eyeMode = 'both'        // 'left', 'right', 'both' (2D plane), 'hemisphere' (Stereo)
    } = options;

    console.log('🔧 Creating DeConvex Shader Material:', {
        srcResolution: `${srcWidth}x${srcHeight}`,
        outResolution: `${outWidth}x${outHeight}`,
        coefficients: DECONVEX_COEFFICIENTS.length,
        enabled: enableDeconvex,
        eyeMode: eyeMode
    });

    // Create 1D DataTexture for lens coefficients (more efficient than uniform array)
    const coeffTexture = new THREE.DataTexture(
        DECONVEX_COEFFICIENTS,
        DECONVEX_COEFFICIENTS.length,
        1,
        THREE.RedFormat,
        THREE.FloatType
    );
    coeffTexture.needsUpdate = true;
    coeffTexture.minFilter = THREE.NearestFilter;  // No interpolation for LUT
    coeffTexture.magFilter = THREE.NearestFilter;

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: videoTexture },
            tCoeffs: { value: coeffTexture },
            uSrcWidth: { value: srcWidth },
            uSrcHeight: { value: srcHeight },
            uOutWidth: { value: outWidth },
            uOutHeight: { value: outHeight },
            uEnableDeconvex: { value: enableDeconvex },
            uCoeffCount: { value: DECONVEX_COEFFICIENTS.length },
            uEyeMode: { value: eyeMode === 'left' ? 0.0 : eyeMode === 'right' ? 1.0 : eyeMode === 'hemisphere' ? 3.0 : 2.0 },
            eyeOffset: { value: 0.0 }  // For web stereo mode (0.0 = left, 0.5 = right)
        },
        
        vertexShader: `
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        
        fragmentShader: `
            uniform sampler2D tDiffuse;      // Video texture
            uniform sampler2D tCoeffs;       // Lens coefficients (1D texture)
            uniform float uSrcWidth;         // Source resolution
            uniform float uSrcHeight;
            uniform float uOutWidth;         // Output resolution
            uniform float uOutHeight;
            uniform bool uEnableDeconvex;    // Toggle correction
            uniform float uCoeffCount;       // Number of coefficients
            uniform float uEyeMode;          // 0=left, 1=right, 2=both(2D plane), 3=hemisphere(Stereo)
            uniform float eyeOffset;         // For web stereo: 0.0=left, 0.5=right
            
            varying vec2 vUv;
            
            /**
             * Get lens coefficient by index from 1D texture
             */
            float getCoefficient(float index) {
                float u = (index + 0.5) / uCoeffCount;  // Normalize to [0, 1]
                return texture2D(tCoeffs, vec2(u, 0.5)).r;
            }
            
            void main() {
                // ========== Eye Mode Processing ==========
                
                if (uEyeMode < 0.5) {
                    // ========== LEFT EYE ONLY (VR left mesh) ==========
                    if (!uEnableDeconvex) {
                        // Original VR left eye: sample from LEFT half (0~0.5), flip horizontally
                        vec2 uv = vec2(0.5 - vUv.x * 0.5, vUv.y);
                        gl_FragColor = texture2D(tDiffuse, uv);
                        return;
                    }
                    
                    // DeConvex enabled: apply to LEFT half
                    // Coefficient lookup: use normalized UV coordinates scaled to coefficient count
                    float norm_y = vUv.y * (uCoeffCount - 1.0);
                    float norm_x = vUv.x * (uCoeffCount - 1.0);
                    
                    float y_coeff_idx = clamp(floor(norm_y), 0.0, uCoeffCount - 1.0);
                    float x_coeff_idx = clamp(floor(norm_x), 0.0, uCoeffCount - 1.0);
                    
                    float y_coeff = getCoefficient(y_coeff_idx);
                    float x_coeff = getCoefficient(x_coeff_idx);
                    
                    // Remap UV using coefficients
                    // Coefficient represents the source UV coordinate for this output pixel
                    vec2 remapEyeUV = vec2(x_coeff, y_coeff);
                    remapEyeUV = clamp(remapEyeUV, 0.0, 1.0);
                    
                    // Sample from LEFT half (0~0.5), 원본과 동일한 플립 적용
                    vec2 finalUV = vec2(0.5 - remapEyeUV.x * 0.5, remapEyeUV.y);
                    gl_FragColor = texture2D(tDiffuse, finalUV);
                    
                } else if (uEyeMode < 1.5) {
                    // ========== RIGHT EYE ONLY (VR right mesh) ==========
                    if (!uEnableDeconvex) {
                        // Original VR right eye: sample from RIGHT half (0.5~1.0), flip horizontally
                        vec2 uv = vec2(1.0 - vUv.x * 0.5, vUv.y);
                        gl_FragColor = texture2D(tDiffuse, uv);
                        return;
                    }
                    
                    // DeConvex enabled: apply to RIGHT half
                    // Coefficient lookup: use normalized UV coordinates scaled to coefficient count
                    float norm_y = vUv.y * (uCoeffCount - 1.0);
                    float norm_x = vUv.x * (uCoeffCount - 1.0);
                    
                    float y_coeff_idx = clamp(floor(norm_y), 0.0, uCoeffCount - 1.0);
                    float x_coeff_idx = clamp(floor(norm_x), 0.0, uCoeffCount - 1.0);
                    
                    float y_coeff = getCoefficient(y_coeff_idx);
                    float x_coeff = getCoefficient(x_coeff_idx);
                    
                    // Remap UV using coefficients
                    vec2 remapEyeUV = vec2(x_coeff, y_coeff);
                    remapEyeUV = clamp(remapEyeUV, 0.0, 1.0);
                    
                    // Sample from RIGHT half (0.5~1.0), 원본과 동일한 플립 적용
                    vec2 finalUV = vec2(1.0 - remapEyeUV.x * 0.5, remapEyeUV.y);
                    gl_FragColor = texture2D(tDiffuse, finalUV);
                    
                } else if (uEyeMode > 2.5) {
                    // ========== HEMISPHERE MODE (Web Stereo with flip) ==========
                    // eyeOffset: 0.0 = left eye, 0.5 = right eye (Z/C key switching)
                    
                    // Determine which eye based on eyeOffset
                    bool showLeftEye = eyeOffset < 0.25;  // 0.0 = left
                    
                    if (!uEnableDeconvex) {
                        // Pass-through: sample from selected half (WITH FLIP for hemisphere)
                        vec2 uv;
                        if (showLeftEye) {
                            // Left eye: sample from LEFT half (0~0.5), flip
                            uv = vec2(0.5 - vUv.x * 0.5, vUv.y);
                        } else {
                            // Right eye: sample from RIGHT half (0.5~1.0), flip
                            uv = vec2(1.0 - vUv.x * 0.5, vUv.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, uv);
                        return;
                    }
                    
                    // DeConvex enabled
                    // Coefficient lookup: use normalized UV coordinates scaled to coefficient count
                    float norm_y = vUv.y * (uCoeffCount - 1.0);
                    float norm_x = vUv.x * (uCoeffCount - 1.0);
                    
                    float y_coeff_idx = clamp(floor(norm_y), 0.0, uCoeffCount - 1.0);
                    float x_coeff_idx = clamp(floor(norm_x), 0.0, uCoeffCount - 1.0);
                    
                    float y_coeff = getCoefficient(y_coeff_idx);
                    float x_coeff = getCoefficient(x_coeff_idx);
                    
                    // Remap UV using coefficients
                    vec2 remapEyeUV = vec2(x_coeff, y_coeff);
                    remapEyeUV = clamp(remapEyeUV, 0.0, 1.0);
                    
                    vec2 finalUV;
                    if (showLeftEye) {
                        // Left eye: sample from LEFT half, WITH flip
                        finalUV = vec2(0.5 - remapEyeUV.x * 0.5, remapEyeUV.y);
                    } else {
                        // Right eye: sample from RIGHT half, WITH flip
                        finalUV = vec2(1.0 - remapEyeUV.x * 0.5, remapEyeUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, finalUV);
                    
                } else {
                    // ========== 2D PLANE MODE (eyeOffset controlled, NO flip) ==========
                    // eyeOffset: 0.0 = left eye, 0.5 = right eye (Z/C key switching)
                    
                    // Determine which eye based on eyeOffset
                    bool showLeftEye = eyeOffset < 0.25;  // 0.0 = left
                    
                    if (!uEnableDeconvex) {
                        // Pass-through: sample from selected half (NO FLIP for 2D plane)
                        vec2 uv;
                        if (showLeftEye) {
                            // Left eye: sample from LEFT half (0~0.5), NO flip
                            uv = vec2(vUv.x * 0.5, vUv.y);
                        } else {
                            // Right eye: sample from RIGHT half (0.5~1.0), NO flip
                            uv = vec2(0.5 + vUv.x * 0.5, vUv.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, uv);
                        return;
                    }
                    
                    // DeConvex enabled (NO FLIP for 2D plane)
                    // Coefficient lookup: use normalized UV coordinates scaled to coefficient count
                    float norm_y = vUv.y * (uCoeffCount - 1.0);
                    float norm_x = vUv.x * (uCoeffCount - 1.0);
                    
                    float y_coeff_idx = clamp(floor(norm_y), 0.0, uCoeffCount - 1.0);
                    float x_coeff_idx = clamp(floor(norm_x), 0.0, uCoeffCount - 1.0);
                    
                    float y_coeff = getCoefficient(y_coeff_idx);
                    float x_coeff = getCoefficient(x_coeff_idx);
                    
                    // Remap UV using coefficients
                    vec2 remapEyeUV = vec2(x_coeff, y_coeff);
                    remapEyeUV = clamp(remapEyeUV, 0.0, 1.0);
                    
                    vec2 finalUV;
                    if (showLeftEye) {
                        // Left eye: sample from LEFT half, NO flip
                        finalUV = vec2(remapEyeUV.x * 0.5, remapEyeUV.y);
                    } else {
                        // Right eye: sample from RIGHT half, NO flip
                        finalUV = vec2(0.5 + remapEyeUV.x * 0.5, remapEyeUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, finalUV);
                }
            }
        `,
        
        side: THREE.DoubleSide,
        transparent: false
    });

    return shaderMaterial;
}

/**
 * Toggle DeConvex correction on existing material
 * @param {THREE.ShaderMaterial} material - DeConvex shader material
 * @param {boolean} enabled - Enable/disable correction
 */
export function toggleDeconvex(material, enabled) {
    if (material && material.uniforms && material.uniforms.uEnableDeconvex) {
        material.uniforms.uEnableDeconvex.value = enabled;
        console.log(`🔧 DeConvex ${enabled ? 'enabled' : 'disabled'}`);
    }
}

/**
 * Update DeConvex resolution settings
 * @param {THREE.ShaderMaterial} material - DeConvex shader material
 * @param {Object} resolution - { srcWidth, srcHeight, outWidth, outHeight }
 */
export function updateDeconvexResolution(material, resolution) {
    if (!material || !material.uniforms) return;
    
    const { srcWidth, srcHeight, outWidth, outHeight } = resolution;
    
    if (srcWidth) material.uniforms.uSrcWidth.value = srcWidth;
    if (srcHeight) material.uniforms.uSrcHeight.value = srcHeight;
    if (outWidth) material.uniforms.uOutWidth.value = outWidth;
    if (outHeight) material.uniforms.uOutHeight.value = outHeight;
    
    console.log('🔧 DeConvex resolution updated:', resolution);
}

/**
 * Check if video filename indicates convex distortion
 * 
 * Detection patterns:
 * 1. {ProjectName}Clip{Number} format (e.g., TXTBClip190)
 *    - ProjectName: 3-4 letters
 *    - "Clip" keyword
 * 2. _CVX or _cvx suffix
 * 3. Other convex-related keywords
 * 
 * @param {string} filename - Video filename or URL
 * @returns {boolean}
 */
export function detectConvexVideo(filename) {
    if (!filename) return false;
    
    // Extract filename from URL path
    // URL에서 파일명 추출 (쿼리 파라미터 제거)
    let basename = filename.split('?')[0]; // 쿼리 파라미터 제거
    basename = basename.split('/').pop().split('\\').pop();
    const lower = basename.toLowerCase();
    
    console.log(`🔍 Extracted filename: ${basename}`);
    
    // Pattern 1: {3-4 letters}Clip{numbers} format
    // Examples: TXTBClip190, ABCDClip001, XYZClip99
    const clipPattern = /[a-z]{3,4}clip\d+/i;
    if (clipPattern.test(basename)) {
        console.log(`🔧 Convex video detected (Clip pattern): ${basename}`);
        return true;
    }
    
    // Pattern 2: _CVX or _cvx suffix
    if (lower.includes('_cvx')) {
        console.log(`🔧 Convex video detected (_cvx): ${basename}`);
        return true;
    }
    
    // Pattern 3: Other convex-related keywords
    const keywords = ['convex', 'fisheye', 'distorted', '_c_'];
    const matched = keywords.some(keyword => lower.includes(keyword));
    if (matched) {
        console.log(`🔧 Convex video detected (keyword): ${basename}`);
        return true;
    }
    
    return false;
}

/**
 * Load DeConvex coefficients as binary (alternative loader if module import fails)
 * @param {string} url - URL to deconvex_lens.bin
 * @returns {Promise<Float32Array>}
 */
export async function loadDeconvexBinary(url = '/static/presets/deconvex_lens.bin') {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load DeConvex binary: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);
        
        // Read header: first 4 bytes = count (uint32 little-endian)
        const count = view.getUint32(0, true);
        
        // Read coefficients: float32 array
        const coefficients = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            coefficients[i] = view.getFloat32(4 + i * 4, true);
        }
        
        console.log(`✅ Loaded ${count} DeConvex coefficients from binary`);
        return coefficients;
        
    } catch (error) {
        console.error('❌ Failed to load DeConvex binary:', error);
        throw error;
    }
}

console.log('✅ DeConvex Shader module loaded');

