import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef, useImperativeHandle } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type MapRef = {
    placeModelAtPosition : (model : string, pos : THREE.Vector3, q: THREE.Quaternion) => void;
    placeHologramAtPosition : (model : string, pos : THREE.Vector3, q: THREE.Quaternion, placeable : Boolean) => void;
}

type MapProps = {
    floors: number[]
}

export const Map = forwardRef<MapRef, MapProps>(({ floors }, ref) => {
    const { gl } = useThree();
    const { nodes } = useGLTF('/chalet_example.glb') as any;
    const [floorGroups, setFloorGroups] = useState<THREE.Group[]>([])
    const [placeableObjs, setPlaceableObjs] = useState<THREE.Group[]>([]);
    const [hologram, setHologram] = useState<THREE.Group>();

    const modelCache = useRef<{ [key:string] : any}>({});
    const loader = new GLTFLoader();

    useEffect(() => {
        const names = ['thermite', 'ace'];
        names.forEach(name => {
            loader.load(`${name}.glb`, (gltf) => {
                modelCache.current[name] = gltf.scene;
            })
        })
    },[])


    useEffect(() => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;

        let newGroups : THREE.Group[] = [];

        floors.forEach((floor, index) => {
            


            const f = nodes[`floor${floor}`];

            if (f){
                const cloned = f.clone();

                cloned.traverse((child: any) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                })

                const unwanted = cloned.getObjectByName(`movement_plane_${floor}`);
                if (unwanted && unwanted.parent){
                    unwanted.parent.remove(unwanted);
                }

                newGroups.push(cloned);
            } 

            //get the invisible movement planes
            const mPlane = nodes[`movement_plane_${floor}`]
            if (mPlane){
                const p = mPlane.clone();

                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();
                mPlane.getWorldPosition(worldPos);
                mPlane.getWorldQuaternion(worldQuat);
                mPlane.getWorldScale(worldScale);

                p.position.copy(worldPos);
                p.quaternion.copy(worldQuat);
                p.scale.copy(worldScale);


                p.material = p.material.clone();
                p.material.transparent = true;
                p.material.opacity = 0;   
                p.layers.set(1);

                newGroups.push(p);
            }

            
    })    
    setFloorGroups(newGroups);

    }, [floors, nodes])


    const updateHologram = (pos : THREE.Vector3, q : THREE.Quaternion) => {
        //const h = hologram?.clone();
        console.log('update holo');
        hologram?.position.copy(pos);
        hologram?.quaternion.copy(q);

    }
    
    
    useImperativeHandle(ref, () => ({
        placeModelAtPosition: (model : string, pos:THREE.Vector3, q: THREE.Quaternion) => {
            console.log(`placeModelAtPosition ${model}(${pos.x}, ${pos.y}, ${pos.z})`)
            
            if (modelCache.current[model]){
                const mod = modelCache.current[model].clone();
                mod.traverse((child:any) => {
                    if ((child as THREE.Mesh).isMesh){
                        child.layers.set(2);
                    }
                });
                mod.position.copy(pos);
                mod.quaternion.copy(q);
                setPlaceableObjs(prev => [...prev, mod]);
            }
            else {
                loader.load(model, (gltf) => {
                    const original = gltf.scene;
                    modelCache.current[model] = original;
                    const mod = original.clone();
                    mod.position.copy(pos);
                    mod.quaternion.copy(q);
                    setPlaceableObjs(prev => [...prev, mod]);
                }
            )
            }
            
            
        },
        placeHologramAtPosition: (model : string, pos : THREE.Vector3, q: THREE.Quaternion, placeable : Boolean) => {
            if (!modelCache.current[model]){
                console.log('model not loaded');
                return;
            }
                
            const desiredColor = placeable 
                ? new THREE.Color(1, 1, 1)
                : new THREE.Color(1, 0, 0);
                
                
            if (hologram && hologram.name === model){
                hologram.traverse(child => {
                    if ((child as THREE.Mesh).isMesh){
                        const mesh = (child as THREE.Mesh);
                        const mat = mesh.material;
                        let matches = false;
                        if (Array.isArray(mat)){
                            mat.forEach(m => {
                                let c = new THREE.Color(0,0,0);
                                if ('color' in m){
                                    c = m.color as THREE.Color;
                                }
                                if (c.getHex() === desiredColor.getHex()) {
                                    updateHologram(pos,q);
                                    matches = true;
                                    return;
                                }
                                else {
                                    m.blendColor = desiredColor.clone();
                                }
                            })
                        }
                        else {
                            let c = new THREE.Color(0,0,0);
                            if ('color' in mat){
                                c = mat.color as THREE.Color;
                            }
                            if (mat.blendColor.getHex() === desiredColor.getHex()){
                                updateHologram(pos,q);
                                matches = true;
                                return;
                            }
                            else {
                                mat.blendColor = desiredColor.clone();
                            }
                        }
                        if (matches){
                            return;
                        }
                    }
                })
                updateHologram(pos,q); //now that it has a corrected material
            }


            const mod = modelCache.current[model].clone();

            mod.position.copy(pos);
            mod.quaternion.copy(q);

            mod.traverse((child:any) => {
                if ((child as THREE.Mesh).isMesh){
                    const mesh = child as THREE.Mesh;

                    if (Array.isArray(mesh.material)) {
                        mesh.material = mesh.material.map((m) => {
                            const cloned = m.clone();
                            cloned.transparent = true;
                            cloned.opacity = 0.5;

                            if ('color' in cloned){
                                cloned.color = desiredColor.clone();
                            }
                            

                            return cloned;
                        });
                    } else {
                        const mat = mesh.material.clone();
                        mat.transparent = true;
                        mat.opacity = 0.5;

                        if ('color' in mat){
                            mat.color = desiredColor.clone();
                        }
                        mesh.material = mat;
                    }
                    mesh.layers.set(2);
                }
            })
            
            setHologram(() => mod);
            
        
            
        }
    }));

    return (
        <>
            {floorGroups.map((group, index) => (
                <primitive key={index} object={group}/>
            ))}

            {placeableObjs.map((group, index) => (
                <primitive key={index} object={group} />
            ))}

            {hologram ? <primitive object={hologram}/> : null}
        </>
    );
});