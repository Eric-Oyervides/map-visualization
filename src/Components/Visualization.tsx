import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect } from 'react';
import BasicLightMapNode from 'three/src/nodes/lighting/BasicLightMapNode.js';
import { NodeMaterial} from 'three/webgpu';
import type {Renderer} from 'three/webgpu';
import { cameraNear } from 'three/tsl';
//import { AmbientLight, BoxGeometry, MeshStandardMaterial } from 'three';

type MapProps = {
    floors: number[]
}

function Map({floors} : MapProps) {
    const { nodes } = useGLTF('/example_map.glb') as any;
    const [meshArray, setMeshArray] = useState<THREE.Mesh[]>([])
    useEffect(() => {
        let newArr : THREE.Mesh[] = [];
        if (nodes["Plane"]) {
            newArr.push(nodes["Plane"]);
        }

        floors.forEach((floor, index) => {
            const f = nodes[`floor${floor}`];
            if (f){
                newArr.push(f);
            } 
    })
        setMeshArray(newArr);
    }, [floors, nodes])
    return (
        <>
            {meshArray.map((n, index) => (
                <mesh 
                    key={index}
                    geometry={n.geometry} 
                    material={n.material}
                    position={n.position}
                    rotation={n.rotation}
                    castShadow
                    receiveShadow
                    
                />
            ))}
        </>
    );
}

function RotatingCube() {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.y += 0.01;
            ref.current.rotation.x += 0.01;
        } 
    })
    return (
        <mesh ref={ref}>
            <boxGeometry />
            <meshStandardMaterial color='magenta' />
        </mesh>
    )
}

export function Lights() {
    const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
    useHelper(directionalLightRef, THREE.DirectionalLightHelper, 1);
    const shadowmap = THREE.PCFShadowMap;
    //const ref = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (directionalLightRef.current){
            directionalLightRef.current.rotation.x += 0.1;
        }
        
    })
    return (
        <>
            {/*
            <directionalLight
                ref={directionalLightRef}
                position={[0,10,0]}
                intensity={1}
                castShadow
            />
            */}
            <pointLight
                position={[2,12,15]}
                intensity={300}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-1e4}
                shadow-normalBias={1e2}
            />
            <pointLight
                position={[-2,12,-15]}
                intensity={300}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-1e4}
                shadow-normalBias={1e2}
            />
            <pointLight
                position={[15,12,-8]}
                intensity={300}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-1e4}
                shadow-normalBias={1e2}
            />
        </>
    )
}

export function Visualization () {
    const [floorsToRender, setFloorsToRender] = useState([1]);
    
    return (
        <Canvas 
            style={{height: '80vh', width: '150vh'}} 
            camera={{position: [30,30,5]}} 
            shadows

        >
            
            <Suspense>
                <SoftShadows size={0.005} samples={17} />
                {/*
                <Environment
                    files="/brown_photostudio_02_2k.hdr"
                    environmentIntensity={0.5}
                    
                    
                >
                </Environment>
                */}

                <Lights />
                <Map floors={floorsToRender}/>
            </Suspense>
            <OrbitControls />
        </Canvas>
    );
}