/**
 * Combined DeConvex + Cannon Lens Distortion Correction Shader
 * 
 * Applies both DeConvex and Cannon lens distortion corrections in sequence:
 * 1. DeConvex correction (if enabled)
 * 2. Cannon lens correction (if enabled)
 */

import * as THREE from '../vendor/three/three.module.js';
import { DECONVEX_COEFFICIENTS } from '../presets/deconvex_lens.js';

/**
 * Create Combined DeConvex + Cannon Shader Material for Three.js
 * @param {THREE.Texture} videoTexture - Video texture to apply distortion correction
 * @param {Object} cannonMaps - Cannon lens maps { left: {mapX, mapY}, right: {mapX, mapY} }
 * @param {Object} options - Configuration options
 * @returns {THREE.ShaderMaterial}
 */
export function createCombinedLensShaderMaterial(videoTexture, cannonMaps, options = {}) {
    const {
        srcWidth = 7680,        // Source video width (8K SBS)
        srcHeight = 3840,       // Source video height
        outWidth = 7680,        // Output target width
        outHeight = 3840,       // Output target height
        enableDeconvex = false, // Enable/disable DeConvex correction
        enableCannon = false,   // Enable/disable Cannon correction
        interpolation = 'linear',
        eyeMode = 'both',       // 'left', 'right', 'both' (2D plane), 'hemisphere' (Stereo)
        swapEyes = true         // true if source video has swapped left/right
    } = options;
    
    console.log('🔧 Creating Combined Lens Shader Material:', {
        srcResolution: `${srcWidth}x${srcHeight}`,
        outResolution: `${outWidth}x${outHeight}`,
        deconvexEnabled: enableDeconvex,
        cannonEnabled: enableCannon,
        eyeMode: eyeMode,
        swapEyes: swapEyes
    });
    
    // Create 1D DataTexture for DeConvex coefficients
    const coeffTexture = new THREE.DataTexture(
        DECONVEX_COEFFICIENTS,
        DECONVEX_COEFFICIENTS.length,
        1,
        THREE.RedFormat,
        THREE.FloatType
    );
    coeffTexture.needsUpdate = true;
    coeffTexture.minFilter = THREE.NearestFilter;
    coeffTexture.magFilter = THREE.NearestFilter;
    
    // Prepare Cannon maps (can be null if not provided)
    const cannonMapX_L = cannonMaps?.left?.mapX || null;
    const cannonMapY_L = cannonMaps?.left?.mapY || null;
    const cannonMapX_R = cannonMaps?.right?.mapX || null;
    const cannonMapY_R = cannonMaps?.right?.mapY || null;
    
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: videoTexture },
            tCoeffs: { value: coeffTexture },
            tCannonMapX_L: { value: cannonMapX_L },
            tCannonMapY_L: { value: cannonMapY_L },
            tCannonMapX_R: { value: cannonMapX_R },
            tCannonMapY_R: { value: cannonMapY_R },
            uSrcWidth: { value: srcWidth },
            uSrcHeight: { value: srcHeight },
            uOutWidth: { value: outWidth },
            uOutHeight: { value: outHeight },
            uEnableDeconvex: { value: enableDeconvex },
            uEnableCannon: { value: enableCannon },
            uCoeffCount: { value: DECONVEX_COEFFICIENTS.length },
            uEyeMode: { value: eyeMode === 'left' ? 0.0 : eyeMode === 'right' ? 1.0 : eyeMode === 'hemisphere' ? 3.0 : 2.0 },
            uSwapEyes: { value: swapEyes ? 1.0 : 0.0 },
            eyeOffset: { value: 0.0 }
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
            uniform sampler2D tCoeffs;         // DeConvex coefficients (1D texture)
            uniform sampler2D tCannonMapX_L; // Cannon Left eye mapX texture
            uniform sampler2D tCannonMapY_L; // Cannon Left eye mapY texture
            uniform sampler2D tCannonMapX_R;  // Cannon Right eye mapX texture
            uniform sampler2D tCannonMapY_R;  // Cannon Right eye mapY texture
            uniform float uSrcWidth;
            uniform float uSrcHeight;
            uniform float uOutWidth;
            uniform float uOutHeight;
            uniform bool uEnableDeconvex;
            uniform bool uEnableCannon;
            uniform float uCoeffCount;
            uniform float uEyeMode;
            uniform float uSwapEyes;
            uniform float eyeOffset;
            
            varying vec2 vUv;
            
            /**
             * Get DeConvex coefficient by index from 1D texture
             */
            float getCoefficient(float index) {
                float u = (index + 0.5) / uCoeffCount;
                return texture2D(tCoeffs, vec2(u, 0.5)).r;
            }
            
            /**
             * Apply DeConvex correction
             * Returns remapped UV coordinates
             */
            vec2 applyDeconvex(vec2 uv, bool isLeftEye) {
                if (!uEnableDeconvex) {
                    return uv;
                }
                
                // Coefficient lookup: use normalized UV coordinates scaled to coefficient count
                float norm_y = uv.y * (uCoeffCount - 1.0);
                float norm_x = uv.x * (uCoeffCount - 1.0);
                
                float y_coeff_idx = clamp(floor(norm_y), 0.0, uCoeffCount - 1.0);
                float x_coeff_idx = clamp(floor(norm_x), 0.0, uCoeffCount - 1.0);
                
                float y_coeff = getCoefficient(y_coeff_idx);
                float x_coeff = getCoefficient(x_coeff_idx);
                
                // Remap UV using coefficients
                // Coefficient represents the source UV coordinate for this output pixel
                vec2 remapEyeUV = vec2(x_coeff, y_coeff);
                
                return clamp(remapEyeUV, 0.0, 1.0);
            }
            
            /**
             * Apply Cannon lens correction
             * Returns remapped UV coordinates
             * 
             * Lens map has rotation, so we need to:
             * 1. Flip input Y when looking up the map (to compensate for map rotation)
             * 2. Flip output Y to correct the final result
             * 
             * Also handles swapped left/right: if swapEyes is true,
             * - Left eye uses RIGHT half of source → use Cannon_R map
             * - Right eye uses LEFT half of source → use Cannon_L map
             */
            vec2 applyCannon(vec2 uv, bool isLeftEye, bool useSwappedEye) {
                if (!uEnableCannon) {
                    return uv;
                }
                
                vec2 remappedUV;
                
                // Determine which lens map to use based on eye and swap flag
                bool useLeftMap = isLeftEye;
                if (useSwappedEye) {
                    useLeftMap = !isLeftEye;  // Swap the map selection
                }
                
                if (useLeftMap) {
                    // Step 1: Flip input Y when looking up the map (compensate for map rotation)
                    vec2 mapCoord = vec2(uv.x, 1.0 - uv.y);
                    float mappedX = texture2D(tCannonMapX_L, mapCoord).r;
                    float mappedY = texture2D(tCannonMapY_L, mapCoord).r;
                    // Step 2: Flip output Y to correct the final result
                    remappedUV = vec2(mappedX, 1.0 - mappedY);
                } else {
                    // Step 1: Flip input Y when looking up the map (compensate for map rotation)
                    vec2 mapCoord = vec2(uv.x, 1.0 - uv.y);
                    float mappedX = texture2D(tCannonMapX_R, mapCoord).r;
                    float mappedY = texture2D(tCannonMapY_R, mapCoord).r;
                    // Step 2: Flip output Y to correct the final result
                    remappedUV = vec2(mappedX, 1.0 - mappedY);
                }
                
                return clamp(remappedUV, 0.0, 1.0);
            }
            
            void main() {
                vec2 finalUV = vUv;
                
                // ========== Eye Mode Processing ==========
                
                if (uEyeMode < 0.5) {
                    // ========== LEFT EYE ONLY (VR left mesh) ==========
                    bool isLeftEye = true;
                    
                    // Step 1: Apply DeConvex correction
                    vec2 deconvexUV = applyDeconvex(vUv, isLeftEye);
                    
                    // Step 2: Apply Cannon correction to DeConvex result
                    // Left eye uses RIGHT half of source when swapped → use Cannon_R map
                    vec2 cannonUV = applyCannon(deconvexUV, isLeftEye, uSwapEyes > 0.5);
                    
                    // Step 3: Map to source video coordinates
                    // Determine source half based on swap flag
                    if (uSwapEyes > 0.5) {
                        // Swap: left eye uses RIGHT half of source, flip
                        finalUV = vec2(1.0 - cannonUV.x * 0.5, cannonUV.y);
                    } else {
                        // Normal: left eye uses LEFT half of source, flip
                        finalUV = vec2(0.5 - cannonUV.x * 0.5, cannonUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    
                } else if (uEyeMode < 1.5) {
                    // ========== RIGHT EYE ONLY (VR right mesh) ==========
                    bool isLeftEye = false;
                    
                    // Step 1: Apply DeConvex correction
                    vec2 deconvexUV = applyDeconvex(vUv, isLeftEye);
                    
                    // Step 2: Apply Cannon correction to DeConvex result
                    // Left eye uses RIGHT half of source when swapped → use Cannon_R map
                    vec2 cannonUV = applyCannon(deconvexUV, isLeftEye, uSwapEyes > 0.5);
                    
                    // Step 3: Map to source video coordinates
                    // Determine source half based on swap flag
                    if (uSwapEyes > 0.5) {
                        // Swap: right eye uses LEFT half of source, flip
                        finalUV = vec2(0.5 - cannonUV.x * 0.5, cannonUV.y);
                    } else {
                        // Normal: right eye uses RIGHT half of source, flip
                        finalUV = vec2(1.0 - cannonUV.x * 0.5, cannonUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    
                } else if (uEyeMode > 2.5) {
                    // ========== HEMISPHERE MODE (Web Stereo with flip) ==========
                    bool showLeftEye = eyeOffset < 0.25;
                    bool isLeftEye = showLeftEye;
                    
                    // Step 1: Apply DeConvex correction
                    vec2 deconvexUV = applyDeconvex(vUv, isLeftEye);
                    
                    // Step 2: Apply Cannon correction to DeConvex result
                    // Left eye uses RIGHT half of source when swapped → use Cannon_R map
                    vec2 cannonUV = applyCannon(deconvexUV, isLeftEye, uSwapEyes > 0.5);
                    
                    // Step 3: Map to source video coordinates (WITH FLIP for hemisphere)
                    if (showLeftEye) {
                        if (uSwapEyes > 0.5) {
                            finalUV = vec2(1.0 - cannonUV.x * 0.5, cannonUV.y);
                        } else {
                            finalUV = vec2(0.5 - cannonUV.x * 0.5, cannonUV.y);
                        }
                    } else {
                        if (uSwapEyes > 0.5) {
                            finalUV = vec2(0.5 - cannonUV.x * 0.5, cannonUV.y);
                        } else {
                            finalUV = vec2(1.0 - cannonUV.x * 0.5, cannonUV.y);
                        }
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    
                } else {
                    // ========== 2D PLANE MODE (eyeOffset controlled, NO flip) ==========
                    bool showLeftEye = eyeOffset < 0.25;
                    bool isLeftEye = showLeftEye;
                    
                    // Step 1: Apply DeConvex correction
                    vec2 deconvexUV = applyDeconvex(vUv, isLeftEye);
                    
                    // Step 2: Apply Cannon correction to DeConvex result
                    // For 2D mode, we need to invert the map selection compared to VR hemisphere mode
                    // When swapEyes=true:
                    //   - showLeftEye=true (left eye display) → uses RIGHT half → should use Cannon_R
                    //   - showLeftEye=false (right eye display) → uses LEFT half → should use Cannon_L
                    // applyCannon with (isLeftEye, swapEyes) swaps when swapEyes=true
                    // But for 2D mode, we need to pass !showLeftEye to get correct map selection
                    vec2 cannonUV = applyCannon(deconvexUV, !showLeftEye, uSwapEyes > 0.5);
                    
                    // Step 3: Map to source video coordinates (NO FLIP for 2D plane)
                    if (showLeftEye) {
                        if (uSwapEyes > 0.5) {
                            // Swap: left eye display uses RIGHT half of source (0.5~1.0), no flip
                            finalUV = vec2(0.5 + cannonUV.x * 0.5, cannonUV.y);
                        } else {
                            // Normal: left eye display uses LEFT half of source (0~0.5), no flip
                            finalUV = vec2(cannonUV.x * 0.5, cannonUV.y);
                        }
                    } else {
                        if (uSwapEyes > 0.5) {
                            // Swap: right eye display uses LEFT half of source (0~0.5), no flip
                            finalUV = vec2(cannonUV.x * 0.5, cannonUV.y);
                        } else {
                            // Normal: right eye display uses RIGHT half of source (0.5~1.0), no flip
                            finalUV = vec2(0.5 + cannonUV.x * 0.5, cannonUV.y);
                        }
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
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
 */
export function toggleDeconvex(material, enabled) {
    if (material && material.uniforms && material.uniforms.uEnableDeconvex) {
        material.uniforms.uEnableDeconvex.value = enabled;
        console.log(`🔧 DeConvex ${enabled ? 'enabled' : 'disabled'}`);
    }
}

/**
 * Toggle Cannon correction on existing material
 */
export function toggleCannon(material, enabled) {
    if (material && material.uniforms && material.uniforms.uEnableCannon) {
        material.uniforms.uEnableCannon.value = enabled;
        console.log(`🔧 Cannon ${enabled ? 'enabled' : 'disabled'}`);
    }
}

console.log('✅ Combined Lens Shader module loaded');

