import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef } from 'react';
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

export function CameraController({command} : {command : null | 'up' | 'down' | 'left' | 'right'}) {
    const {camera, gl, scene} = useThree();
    const orbitControls = useRef<any>(null);
    const [camTarget, setCamTarget] = useState<[number, number, number]>([0,0,0]); 
    const [lockTarget, setLockTarget] = useState(true);
    const controlsRef = useRef<any>(null);

    let controls = controlsRef.current;

    useEffect(() => {
        cameraRaycast();
    },[]);

    const cameraRaycast = () => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const raycaster = new THREE.Raycaster(camera.position, direction);

        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            controls = controlsRef.current;
            const currentPos = camera.position.clone();
            controls.target.copy(intersects[0].point);
            controls.update();
            camera.position.copy(currentPos);
            controls.enabled = true;
        }
    }

    
    useFrame(() => {
        const diff = 0.02;

        switch (command) {
            case 'up':
                camera.position.add(calculateDir(diff));
                controls = controlsRef.current;
                controls.enabled = false;
                setLockTarget(false);
                break;
            case 'down':
                camera.position.add(calculateDir(diff));
                controls = controlsRef.current;
                controls.enabled = false;
                setLockTarget(false);
                break;
            case 'left':
                camera.position.add(calculateDir(diff));
                controls = controlsRef.current;
                controls.enabled = false;
                setLockTarget(false);
                break;
            case 'right':
                camera.position.add(calculateDir(diff));
                controls = controlsRef.current;
                controls.enabled = false;
                setLockTarget(false);
                break;
            default:
                updateTarget();
                break;
        }
        
    });

    const calculateDir = (diff:number) => {
        const relDir : THREE.Vector3 = new THREE.Vector3();
        camera.getWorldDirection(relDir);

        const up = camera.up.clone();
        const right = new THREE.Vector3();
        right.crossVectors(relDir, up).normalize;

        const front = new THREE.Vector3();

        switch (command){
            case 'up':
                front.crossVectors(right, new THREE.Vector3(0,1,0));
                return (front.multiplyScalar(-diff));
            case 'down':
                front.crossVectors(right, new THREE.Vector3(0,1,0));
                return (front.multiplyScalar(diff));
            case 'left':
                return (right.multiplyScalar(-diff));
            case 'right':
                return (right.multiplyScalar(diff))
        }
        return (right.multiplyScalar(diff))
    }

    const updateTarget = () => {
        controls = controlsRef.current;
        if (!controls) return;

        if (!lockTarget){
            cameraRaycast();
        }
        setLockTarget(true);
        
    }

    return (
        <>
            <OrbitControls 
                ref={controlsRef}
                enablePan={false}
                enableZoom={false}
                enableRotate={true}
            />
        </>
    )
}

export function Visualization () {
    const [floorsToRender, setFloorsToRender] = useState([1]);
    const [camCommand, setCamCommand] = useState<null | 'up' | 'down' | 'left' | 'right'>(null);


    return (
        <div 
            style={{
                display: "flex", 
                background: "#c7c7c7", 
                width: "100%",
                height: "100%",
                maxHeight: '1080px', 
                maxWidth: '1920px', 
                minHeight: '100px', 
                minWidth: '500px', 
                flex:"1 1 auto"
            }}
        >
            <Canvas 
                style={{
                    height:"100%", 
                    width: "100%", 
                    flex: "1 1 auto"
                }} 
                camera={{position: [0,8,10], fov: 70} } 
                shadows
            >
                <CameraController command={camCommand} />
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
            </Canvas>
            <button onMouseDown={() => setCamCommand('up')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "500px", top: "50px"}}>Up</button>
            <button onMouseDown={() => setCamCommand('down')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "500px", top: "700px"}}>Down</button>
            <button onMouseDown={() => setCamCommand('left')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "50px", top: "350px"}}>Left</button>
            <button onMouseDown={() => setCamCommand('right')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "1000px", top: "350px"}}>Right</button>
        </div>
    );
}