import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef } from 'react';
import { Map } from './Map';
import type { MapRef } from './Map';
import { CameraController } from './CameraController';
import { ModelPlacer } from './ModelPlacer';



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
    const mapRef = useRef<MapRef>(null);

    const [floorsToRender, setFloorsToRender] = useState([1]);
    const [camCommand, setCamCommand] = useState<null | 'up' | 'down' | 'left' | 'right'>(null);
    const [currFloor, setCurrFloor] = useState(1);
    const [zoomValue, setZoomValue] = useState(0);

    const [currModel, setCurrModel] = useState("");

    const goFloorUp = () => {
        if (floorsToRender.length === 1){
            setFloorsToRender([1,2])
            setCurrFloor(2);

        }
        setZoomValue(()=>0);
    }

    const goFloorDown = () => {
        if (floorsToRender.length === 2){
            setFloorsToRender([1]);
            setCurrFloor(1);

        }
        setZoomValue(()=>0);
    }

    const GUI = (
        <>
        <button onClick={() => goFloorUp()} style={{position: "absolute", left: "900px", top: "150px"}}>Floor up</button>
        <button onClick={() => goFloorDown()} style={{position: "absolute", left: "900px", top: "220px"}}>Floor down</button>

        <button onClick={() => setCurrModel('thermite')} style={{position: "absolute", left: "700px", top: "900px"}}>1</button>
        <button onClick={() => setCurrModel('ace')} style={{position: "absolute", left: "750px", top: "900px"}}>2</button>

            <input 
                type='range' 
                min="0" 
                max="10" 
                step=".1" 
                value={zoomValue} 
                style={{
                    position: "absolute", 
                    left: "900px", 
                    top: "700px"
                }} 
                onChange={(e)=> setZoomValue(Number(e.target.value))}
            />

            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('up')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "500px", top: "50px"}}>Up</button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('down')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "500px", top: "700px"}}>Down</button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('left')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "50px", top: "350px"}}>Left</button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('right')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "1000px", top: "350px"}}>Right</button>
        </>
    )

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
                camera={{position: [10,16,20], fov: 60} } 
                shadows
            >
                <CameraController command={camCommand} floor={currFloor} zoom={zoomValue} />
                <Suspense>
                    <SoftShadows size={0.005} samples={17} />

                    <Lights />
                    <Map ref={mapRef} floors={floorsToRender}/>
                    {currModel === "" ? null : <ModelPlacer mapRef={mapRef} modelName={currModel}/>}
                </Suspense>
            </Canvas>

            {GUI}
        </div>
    );
}