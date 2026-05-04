import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef } from 'react';


export type CamCommand = 
    | null
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up-left'
    | 'up-right'
    | 'down-left'
    | 'down-right';

type CameraProps = {
    command : CamCommand;
    floor : number;
    zoom : number;
    orbitEnabled?: boolean;
}

export function CameraController({command, floor, zoom, orbitEnabled = true} : CameraProps) {
    const {camera, gl, scene} = useThree();
    //const [camTarget, setCamTarget] = useState<[number, number, number]>([0,0,0]); 
    const [lockTarget, setLockTarget] = useState(true);
    const [maxZoom, setMaxZoom] = useState(3);
    const [basePosition, setBasePosition] = useState<THREE.Vector3>(new THREE.Vector3(0,8,10));
    const [camFloor, setCamFloor] = useState(1);

    const controlsRef = useRef<any>(null);
    

    const floorHeight = 5;

    //let controls = controlsRef.current;

    useEffect(() => {
        const controls = controlsRef.current;
        controls.target = camera.position.clone().add(new THREE.Vector3(0,-8, 10))
        setCamFloor(()=>floor);
        cameraRaycast();
        calculateZoom();
        calculateHeight();

        camera.layers.enable(2);
    },[]);

    useEffect(() => {
        calculateHeight();
    },[floor])

    useEffect(()=> {
        calculateZoom();
    },[zoom])

    useFrame((state, delta) => {
        const diff = 23;

        if (command) {
            const controls = controlsRef.current;
            controls.enabled = false;

            camera.position.add(calculateDir(diff, delta));

            setLockTarget(false);
        } else {
            const controls = controlsRef.current;

            if (controls) {
                controls.enabled = orbitEnabled;
            }

            updateTarget();
        }

    

    });

    const heightCalculation = () => {
        if (camFloor < floor){
            setCamFloor(prev => prev+1);
            return camera.position.y + floorHeight;
        }
        else if (camFloor > floor){
            setCamFloor(prev => prev-1);
            return camera.position.y - floorHeight;
        }
        return camera.position.y;
    }

    const calculateHeight = () => {
        
        const newCamPos = camera.position.clone();
        newCamPos.y = heightCalculation();
        camera.position.copy(newCamPos);

        const controls = controlsRef.current;
        controls.enabled = false;
        setLockTarget(false);

    }


    const calculateZoom = () => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        //const camPos = camera.position.clone();

        //const angle = Math.atan2(direction.y, Math.sqrt(direction.x ** 2 + direction.z ** 2));
        //const d = (heightCalculation()-camPos.y)/(Math.sin(angle));
        
        //const negatedDir = direction.clone().negate();
        //const basePos = camPos.add(negatedDir.clone().multiplyScalar(d));
        
        const controls = controlsRef.current;
        const basePos = controls.target.clone().add(direction.clone().negate().multiplyScalar(28-(23*zoom/10)))

        const newPos = basePos.clone().add(direction.clone().multiplyScalar(zoom/10))
        camera.position.copy(newPos);

        
    }

    const cameraRaycast = () => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const raycaster = new THREE.Raycaster(camera.position, direction);
        raycaster.layers.set(1);

        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const controls = controlsRef.current;
            const currentPos = camera.position.clone();
            controls.target.copy(intersects[0].point);
            controls.update();
            camera.position.copy(currentPos);
            controls.enabled = true;

            //setMaxZoom(() => camera.position.clone().add(intersects[0].point.negate()).length())
        }
    }

    


    const calculateDir = (diff: number, delta: number) => {
        const relDir = new THREE.Vector3();
        camera.getWorldDirection(relDir);

        const up = camera.up.clone();

        const right = new THREE.Vector3();
        right.crossVectors(relDir, up).normalize();

        const front = new THREE.Vector3();
        front.crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize();

        const movement = new THREE.Vector3();

        switch (command) {
            case 'up':
                movement.add(front.clone().multiplyScalar(-1));
                break;

            case 'down':
                movement.add(front.clone());
                break;

            case 'left':
                movement.add(right.clone().multiplyScalar(-1));
                break;

            case 'right':
                movement.add(right.clone());
                break;

            case 'up-left':
                movement.add(front.clone().multiplyScalar(-1));
                movement.add(right.clone().multiplyScalar(-1));
                break;

            case 'up-right':
                movement.add(front.clone().multiplyScalar(-1));
                movement.add(right.clone());
                break;

            case 'down-left':
                movement.add(front.clone());
                movement.add(right.clone().multiplyScalar(-1));
                break;

            case 'down-right':
                movement.add(front.clone());
                movement.add(right.clone());
                break;
        }

        return movement.normalize().multiplyScalar(diff * delta);
    };

    const updateTarget = () => {
        const controls = controlsRef.current;
        if (!controls) return;

        if (!lockTarget){
            cameraRaycast();
            controls.enabled = true;
        }
        setLockTarget(true);
    }

    return (
        <>
            <OrbitControls 
                ref={controlsRef}
                enabled={orbitEnabled}
                enablePan={false}
                enableZoom={false}
                enableRotate={true}
                mouseButtons={{
                    RIGHT: THREE.MOUSE.ROTATE
                }}
                minPolarAngle={0}
                maxPolarAngle={Math.PI * 4 / 9}
            />
        </>
    )
}
