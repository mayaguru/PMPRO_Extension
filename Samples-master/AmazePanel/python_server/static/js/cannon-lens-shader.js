/**
 * Cannon Lens Distortion Correction Shader
 * 
 * Applies Canon lens distortion correction using HVMap UV mapping
 * Works in conjunction with DeConvex correction
 */

import * as THREE from '../vendor/three/three.module.js';

/**
 * Create Cannon Lens Shader Material for Three.js
 * @param {THREE.Texture} videoTexture - Video texture to apply distortion correction
 * @param {Object} cannonMaps - Cannon lens maps { left: {mapX, mapY}, right: {mapX, mapY} }
 * @param {Object} options - Configuration options
 * @returns {THREE.ShaderMaterial}
 */
export function createCannonLensShaderMaterial(videoTexture, cannonMaps, options = {}) {
    const {
        srcWidth = 7680,        // Source video width (8K SBS)
        srcHeight = 3840,       // Source video height
        enableCannon = true,   // Enable/disable correction
        eyeMode = 'both',      // 'left', 'right', 'both' (2D plane), 'hemisphere' (Stereo)
        swapEyes = true        // true if source video has swapped left/right
    } = options;
    
    if (!cannonMaps || !cannonMaps.left || !cannonMaps.right) {
        console.error('❌ Cannon maps not provided');
        return null;
    }
    
    console.log('🔧 Creating Cannon Lens Shader Material:', {
        srcResolution: `${srcWidth}x${srcHeight}`,
        enabled: enableCannon,
        eyeMode: eyeMode,
        swapEyes: swapEyes
    });
    
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: videoTexture },
            tCannonMapX_L: { value: cannonMaps.left.mapX },
            tCannonMapY_L: { value: cannonMaps.left.mapY },
            tCannonMapX_R: { value: cannonMaps.right.mapX },
            tCannonMapY_R: { value: cannonMaps.right.mapY },
            uSrcWidth: { value: srcWidth },
            uSrcHeight: { value: srcHeight },
            uEnableCannon: { value: enableCannon },
            uEyeMode: { value: eyeMode === 'left' ? 0.0 : eyeMode === 'right' ? 1.0 : eyeMode === 'hemisphere' ? 3.0 : 2.0 },
            uSwapEyes: { value: swapEyes ? 1.0 : 0.0 },  // Swap left/right source if needed
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
            uniform sampler2D tCannonMapX_L; // Cannon Left eye mapX texture
            uniform sampler2D tCannonMapY_L; // Cannon Left eye mapY texture
            uniform sampler2D tCannonMapX_R; // Cannon Right eye mapX texture
            uniform sampler2D tCannonMapY_R; // Cannon Right eye mapY texture
            uniform float uSrcWidth;         // Source resolution
            uniform float uSrcHeight;
            uniform bool uEnableCannon;      // Toggle correction
            uniform float uEyeMode;          // 0=left, 1=right, 2=both(2D plane), 3=hemisphere(Stereo)
            uniform float uSwapEyes;        // Swap left/right source (1.0 = swap, 0.0 = no swap)
            uniform float eyeOffset;        // For web stereo: 0.0=left, 0.5=right
            
            varying vec2 vUv;
            
            void main() {
                if (!uEnableCannon) {
                    // Pass-through: no Cannon correction
                    // Use original UV mapping based on eye mode
                    if (uEyeMode < 0.5) {
                        // Left eye: sample from LEFT half, flip horizontally
                        vec2 uv = vec2(0.5 - vUv.x * 0.5, vUv.y);
                        gl_FragColor = texture2D(tDiffuse, uv);
                    } else if (uEyeMode < 1.5) {
                        // Right eye: sample from RIGHT half, flip horizontally
                        vec2 uv = vec2(1.0 - vUv.x * 0.5, vUv.y);
                        gl_FragColor = texture2D(tDiffuse, uv);
                    } else if (uEyeMode > 2.5) {
                        // Hemisphere mode (with flip)
                        bool showLeftEye = eyeOffset < 0.25;
                        vec2 uv;
                        if (showLeftEye) {
                            uv = vec2(0.5 - vUv.x * 0.5, vUv.y);
                        } else {
                            uv = vec2(1.0 - vUv.x * 0.5, vUv.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, uv);
                    } else {
                        // 2D plane mode (no flip)
                        bool showLeftEye = eyeOffset < 0.25;
                        vec2 uv;
                        if (showLeftEye) {
                            uv = vec2(vUv.x * 0.5, vUv.y);
                        } else {
                            uv = vec2(0.5 + vUv.x * 0.5, vUv.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, uv);
                    }
                    return;
                }
                
                // ========== Cannon Lens Correction Enabled ==========
                
                if (uEyeMode < 0.5) {
                    // ========== LEFT EYE ONLY (VR left mesh) ==========
                    // Map UV coordinates through Cannon left lens map
                    vec2 cannonCoord = vUv;
                    float mappedX = texture2D(tCannonMapX_L, cannonCoord).r;
                    float mappedY = texture2D(tCannonMapY_L, cannonCoord).r;
                    vec2 remappedUV = vec2(mappedX, mappedY);
                    
                    // Determine source half based on swap flag
                    // If swapEyes = true, left eye should use RIGHT half of source
                    vec2 finalUV;
                    if (uSwapEyes > 0.5) {
                        // Swap: left eye uses RIGHT half of source (0.5~1.0), flip
                        finalUV = vec2(1.0 - remappedUV.x * 0.5, remappedUV.y);
                    } else {
                        // Normal: left eye uses LEFT half of source (0~0.5), flip
                        finalUV = vec2(0.5 - remappedUV.x * 0.5, remappedUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    
                } else if (uEyeMode < 1.5) {
                    // ========== RIGHT EYE ONLY (VR right mesh) ==========
                    // Map UV coordinates through Cannon right lens map
                    vec2 cannonCoord = vUv;
                    float mappedX = texture2D(tCannonMapX_R, cannonCoord).r;
                    float mappedY = texture2D(tCannonMapY_R, cannonCoord).r;
                    vec2 remappedUV = vec2(mappedX, mappedY);
                    
                    // Determine source half based on swap flag
                    // If swapEyes = true, right eye should use LEFT half of source
                    vec2 finalUV;
                    if (uSwapEyes > 0.5) {
                        // Swap: right eye uses LEFT half of source (0~0.5), flip
                        finalUV = vec2(0.5 - remappedUV.x * 0.5, remappedUV.y);
                    } else {
                        // Normal: right eye uses RIGHT half of source (0.5~1.0), flip
                        finalUV = vec2(1.0 - remappedUV.x * 0.5, remappedUV.y);
                    }
                    
                    gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    
                } else if (uEyeMode > 2.5) {
                    // ========== HEMISPHERE MODE (Web Stereo with flip) ==========
                    bool showLeftEye = eyeOffset < 0.25;
                    
                    vec2 cannonCoord = vUv;
                    vec2 remappedUV;
                    
                    if (showLeftEye) {
                        // Left eye: use Cannon left lens map
                        float mappedX = texture2D(tCannonMapX_L, cannonCoord).r;
                        float mappedY = texture2D(tCannonMapY_L, cannonCoord).r;
                        remappedUV = vec2(mappedX, mappedY);
                        
                        // Determine source half based on swap flag
                        vec2 finalUV;
                        if (uSwapEyes > 0.5) {
                            // Swap: left eye uses RIGHT half, flip
                            finalUV = vec2(1.0 - remappedUV.x * 0.5, remappedUV.y);
                        } else {
                            // Normal: left eye uses LEFT half, flip
                            finalUV = vec2(0.5 - remappedUV.x * 0.5, remappedUV.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    } else {
                        // Right eye: use Cannon right lens map
                        float mappedX = texture2D(tCannonMapX_R, cannonCoord).r;
                        float mappedY = texture2D(tCannonMapY_R, cannonCoord).r;
                        remappedUV = vec2(mappedX, mappedY);
                        
                        // Determine source half based on swap flag
                        vec2 finalUV;
                        if (uSwapEyes > 0.5) {
                            // Swap: right eye uses LEFT half, flip
                            finalUV = vec2(0.5 - remappedUV.x * 0.5, remappedUV.y);
                        } else {
                            // Normal: right eye uses RIGHT half, flip
                            finalUV = vec2(1.0 - remappedUV.x * 0.5, remappedUV.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    }
                    
                } else {
                    // ========== 2D PLANE MODE (eyeOffset controlled, NO flip) ==========
                    bool showLeftEye = eyeOffset < 0.25;
                    
                    vec2 cannonCoord = vUv;
                    vec2 remappedUV;
                    
                    if (showLeftEye) {
                        // Left eye: use Cannon left lens map
                        float mappedX = texture2D(tCannonMapX_L, cannonCoord).r;
                        float mappedY = texture2D(tCannonMapY_L, cannonCoord).r;
                        remappedUV = vec2(mappedX, mappedY);
                        
                        // Determine source half based on swap flag (NO FLIP for 2D plane)
                        vec2 finalUV;
                        if (uSwapEyes > 0.5) {
                            // Swap: left eye uses RIGHT half, no flip
                            finalUV = vec2(0.5 + remappedUV.x * 0.5, remappedUV.y);
                        } else {
                            // Normal: left eye uses LEFT half, no flip
                            finalUV = vec2(remappedUV.x * 0.5, remappedUV.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    } else {
                        // Right eye: use Cannon right lens map
                        float mappedX = texture2D(tCannonMapX_R, cannonCoord).r;
                        float mappedY = texture2D(tCannonMapY_R, cannonCoord).r;
                        remappedUV = vec2(mappedX, mappedY);
                        
                        // Determine source half based on swap flag (NO FLIP for 2D plane)
                        vec2 finalUV;
                        if (uSwapEyes > 0.5) {
                            // Swap: right eye uses LEFT half, no flip
                            finalUV = vec2(remappedUV.x * 0.5, remappedUV.y);
                        } else {
                            // Normal: right eye uses RIGHT half, no flip
                            finalUV = vec2(0.5 + remappedUV.x * 0.5, remappedUV.y);
                        }
                        gl_FragColor = texture2D(tDiffuse, clamp(finalUV, 0.0, 1.0));
                    }
                }
            }
        `,
        
        side: THREE.DoubleSide,
        transparent: false
    });

    return shaderMaterial;
}

/**
 * Toggle Cannon lens correction on existing material
 * @param {THREE.ShaderMaterial} material - Cannon shader material
 * @param {boolean} enabled - Enable/disable correction
 */
export function toggleCannon(material, enabled) {
    if (material && material.uniforms && material.uniforms.uEnableCannon) {
        material.uniforms.uEnableCannon.value = enabled;
        console.log(`🔧 Cannon ${enabled ? 'enabled' : 'disabled'}`);
    }
}

console.log('✅ Cannon Lens Shader module loaded');

