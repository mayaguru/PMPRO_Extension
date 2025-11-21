#!/usr/bin/env python3
"""
cleanup_showflow.py
Remove duration, in, out from all clips in showflow JSON
Keep only name and time (time is authoritative)
"""
import json
import sys

def cleanup_showflow(file_path):
    """Remove duration metadata from showflow file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'slots' not in data:
        print("No slots found in showflow file")
        return
    
    for slot in data['slots']:
        # Remove slot duration (will be calculated from time)
        if 'duration' in slot:
            del slot['duration']
        
        # Clean up clips
        if 'clips' in slot:
            for track_key, clip in slot['clips'].items():
                if isinstance(clip, dict):
                    # Keep only name
                    if 'name' in clip:
                        slot['clips'][track_key] = clip['name']
                    else:
                        # If no name, keep as-is but remove duration/in/out
                        for key in ['duration', 'in', 'out']:
                            if key in clip:
                                del clip[key]
    
    # Save back
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"[OK] Cleaned up: {file_path}")
    print(f"  - Removed all clip duration/in/out metadata")
    print(f"  - Removed all slot duration metadata")
    print(f"  - Simplified clip format to just names where possible")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = r'D:\_DEV\PremiereScripts\Scripts\Samples-master\AmazePanel\flow\TXTB.showflow.JSON'
    
    cleanup_showflow(file_path)
