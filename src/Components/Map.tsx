import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef, useImperativeHandle } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSG } from "three-csg-ts";

export type MapRef = {
    placeModelAtPosition : (model : string, pos : THREE.Vector3, q: THREE.Quaternion) => void;
    placeHologramAtPosition : (model : string, pos : THREE.Vector3, q: THREE.Quaternion, placeable : Boolean) => void;
    deactivateHologram : () => void;
    applyDestruction: () => void;
}

type MapProps = {
    floors: number[]
}



export const Map = forwardRef<MapRef, MapProps>(({ floors }, ref) => {
    type DestructionType = "box-cut";

    type DestructionConfig = {
        type: DestructionType;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        offset: THREE.Vector3;
    };

    const destructionConfigs: Record<string, DestructionConfig> = {
        ace: {
            type: "box-cut",
            size: {
                width: 4,
                height: 2.7,
                depth: 2.2
            },
            offset: new THREE.Vector3(0,-1.5,-.5),
        },
        thermite: {
            type: "box-cut",
            size: {
                width: 5.0,
                height: 5.0,
                depth: 2.2,
            },
            offset: new THREE.Vector3(0, -1, -.5),
        },
    };

    type PlacedObject = {
        id: string,
        modelName: string,
        object: THREE.Group;
    };

    const { gl } = useThree();
    const { nodes } = useGLTF('/chalet_example.glb') as any;
    const [floorGroups, setFloorGroups] = useState<THREE.Group[]>([])
    const [placeableObjs, setPlaceableObjs] = useState<PlacedObject[]>([]);
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

                        if (child.name.toLowerCase().includes("destructible")){
                            child.userData.destructible = true;
                        }
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

    const createBoxCutter = (placedObject: PlacedObject, config: DestructionConfig) => {
        const geometry = new THREE.BoxGeometry(
            config.size.width,
            config.size.height,
            config.size.depth
        );
        

        const material = new THREE.MeshBasicMaterial();


        const cutter = new THREE.Mesh(geometry, material);

        cutter.position.copy(placedObject.object.position);
        cutter.quaternion.copy(placedObject.object.quaternion);

        const offset = config.offset.clone();
        offset.applyQuaternion(placedObject.object.quaternion);
        cutter.position.add(offset);

        cutter.updateMatrixWorld(true);

        return cutter;
    };

    const applyDestruction = () => {
        const updatedFloorGroups = floorGroups.map(group => group.clone(true));

        placeableObjs.forEach(placed => {
            const config = destructionConfigs[placed.modelName];
            if (!config) return;

            const cutter = createBoxCutter(placed, config);

            const destructibleMeshes: THREE.Mesh[] = [];

            updatedFloorGroups.forEach(group => {
                group.traverse((child: any) => {
                    if (child.isMesh && child.userData.destructible) {
                        destructibleMeshes.push(child as THREE.Mesh);
                    }
                });
            });

            destructibleMeshes.forEach((wallMesh) => {
                let success = false;

                const offsets = [
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, -0.2, 0),
                    new THREE.Vector3(0, 0.2, 0),
                    new THREE.Vector3(0.2, 0, 0),
                    new THREE.Vector3(-0.2, 0, 0),
                ];

                for (let i = 0; i < offsets.length; i++) {
                    try {
                        const testCutter = cutter.clone();

                        testCutter.position.add(offsets[i]);

                        wallMesh.updateMatrix();
                        wallMesh.updateMatrixWorld(true);

                        testCutter.updateMatrix();
                        testCutter.updateMatrixWorld(true);

                        const resultMesh = CSG.subtract(wallMesh, testCutter);

                        if (
                            resultMesh &&
                            resultMesh.geometry &&
                            resultMesh.geometry.attributes.position.count > 0
                        ) {
                            resultMesh.name = wallMesh.name;
                            resultMesh.userData = {
                                ...wallMesh.userData,
                                destructible: true,
                            };

                            resultMesh.castShadow = true;
                            resultMesh.receiveShadow = true;
                            resultMesh.material = wallMesh.material;
                            resultMesh.layers.mask = wallMesh.layers.mask;

                            resultMesh.position.copy(wallMesh.position);
                            resultMesh.quaternion.copy(wallMesh.quaternion);
                            resultMesh.scale.copy(wallMesh.scale);

                            const parent = wallMesh.parent;

                            if (parent) {
                                parent.remove(wallMesh);
                                parent.add(resultMesh);
                            }

                            success = true;
                            break;
                        }
                    } catch (err) {
                        console.warn("CSG retry failed:", wallMesh.name, i, err);
                    }
                }

                if (!success) {
                    console.warn("CSG failed after retries:", wallMesh.name);
                }
            });
        });

        setFloorGroups(updatedFloorGroups);
        setPlaceableObjs([]);
    };

    
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
                setPlaceableObjs(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        modelName: model,
                        object: mod,
                    }
                ]);
            }
            else {
                loader.load(model, (gltf) => {
                    const original = gltf.scene;
                    modelCache.current[model] = original;
                    const mod = original.clone();
                    mod.position.copy(pos);
                    mod.quaternion.copy(q);
                    setPlaceableObjs(prev => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            modelName: model,
                            object: mod,
                        }
                    ]);
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
                
                
            if (hologram && hologram.name === model) {
                hologram.traverse((child: any) => {
                    if (child.isMesh) {
                        const mesh = child as THREE.Mesh;

                        if (Array.isArray(mesh.material)) {
                            mesh.material.forEach((mat: any) => {
                                if ('color' in mat) {
                                    mat.color.copy(desiredColor);
                                }
                            });
                        } else {
                            const mat: any = mesh.material;
                            if ('color' in mat) {
                                mat.color.copy(desiredColor);
                            }
                        }
                    }
                });

                updateHologram(pos, q);
                return;
            }


            const mod = modelCache.current[model].clone();
            mod.name = model;

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
            
        
            
        },
        deactivateHologram: () => {
            setHologram(undefined);
        },
        applyDestruction 
        
    }));

    return (
        <>
            {floorGroups.map((group, index) => (
                <primitive key={index} object={group}/>
            ))}

            {placeableObjs.map((placed) => (
                <primitive key={placed.id} object={placed.object} />
            ))}

            {hologram ? <primitive object={hologram}/> : null}
        </>
    );
});