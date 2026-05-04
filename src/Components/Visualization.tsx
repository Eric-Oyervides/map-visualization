import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef } from 'react';
import { Map } from './Map';
import type { MapRef } from './Map';
import { CameraController } from './CameraController';
import { ModelPlacer } from './ModelPlacer';
// import { GoArrowUp } from "react-icons/go";
// import { GoArrowDown } from "react-icons/go";
// import { GoArrowLeft } from "react-icons/go";
// import { GoArrowRight } from "react-icons/go";
import { GoZoomIn } from "react-icons/go";
import { HiArrowsExpand } from "react-icons/hi";
import AceLogo from "/public/Ace Logo.avif";
import ThermiteLogo from "/public/Thermite Logo.png";
import "./Visualization.css";
import {
  GoArrowUp,
  GoArrowDown,
  GoArrowLeft,
  GoArrowRight,
  GoArrowUpLeft,
  GoArrowUpRight,
  GoArrowDownLeft,
  GoArrowDownRight,
} from "react-icons/go";


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

    type CamCommand =
    | null
    | "up"
    | "down"
    | "left"
    | "right"
    | "up-left"
    | "up-right"
    | "down-left"
    | "down-right";

    type MoveDirection =
    | null
    | "forward-left"
    | "forward"
    | "forward-right"
    | "left"
    | "right"
    | "backward-left"
    | "backward"
    | "backward-right";


    const mapRef = useRef<MapRef>(null);

    const [floorsToRender, setFloorsToRender] = useState([1]);
    const [camCommand, setCamCommand] = useState<CamCommand>(null);
    const [isLeftMouseDown, setIsLeftMouseDown] = useState(false);
    const [isRightMouseDown, setIsRightMouseDown] = useState(false);

    const [currFloor, setCurrFloor] = useState(1);
    const [zoomValue, setZoomValue] = useState(0);

    const [currModel, setCurrModel] = useState("");

    //move mode
    const [isMoveMode, setIsMoveMode] = useState(true);
    const [moveDirection, setMoveDirection] = useState<MoveDirection>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!isMoveMode || !isLeftMouseDown) return;

        setCamCommand(moveDirectionToCamCommand(moveDirection));
    }, [moveDirection, isMoveMode, isLeftMouseDown]);

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

    const enterMoveMode = () => {
        setCurrModel("");
        setIsMoveMode(true);
        mapRef.current?.deactivateHologram();
    };

    const handleMoveModeMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isMoveMode) return;

        if (isHoveringUI(e.target)) {
            setMoveDirection(null);
            setCamCommand(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCursorPos({ x, y });

        const colWidth = rect.width / 3;
        const rowHeight = rect.height / 3;

        const col =
            x < colWidth ? "left" :
            x < colWidth * 2 ? "center" :
            "right";

        const row =
            y < rowHeight ? "forward" :
            y < rowHeight * 2 ? "center" :
            "backward";

        if (row === "forward" && col === "left") {
            setMoveDirection("forward-left");
        } else if (row === "forward" && col === "center") {
            setMoveDirection("forward");
        } else if (row === "forward" && col === "right") {
            setMoveDirection("forward-right");
        } else if (row === "center" && col === "left") {
            setMoveDirection("left");
        } else if (row === "center" && col === "center") {
            setMoveDirection(null);
        } else if (row === "center" && col === "right") {
            setMoveDirection("right");
        } else if (row === "backward" && col === "left") {
            setMoveDirection("backward-left");
        } else if (row === "backward" && col === "center") {
            setMoveDirection("backward");
        } else if (row === "backward" && col === "right") {
            setMoveDirection("backward-right");
        }
    };

    const getMoveIcon = () => {
        switch (moveDirection) {
            case "forward-left":
            return <GoArrowUpLeft />;
            case "forward":
            return <GoArrowUp />;
            case "forward-right":
            return <GoArrowUpRight />;
            case "left":
            return <GoArrowLeft />;
            case "right":
            return <GoArrowRight />;
            case "backward-left":
            return <GoArrowDownLeft />;
            case "backward":
            return <GoArrowDown />;
            case "backward-right":
            return <GoArrowDownRight />;
            default:
            return null;
        }
    };

    const moveDirectionToCamCommand = (direction: MoveDirection): CamCommand => {
        switch (direction) {
            case "forward-left":
            return "up-left";
            case "forward":
            return "up";
            case "forward-right":
            return "up-right";
            case "left":
            return "left";
            case "right":
            return "right";
            case "backward-left":
            return "down-left";
            case "backward":
            return "down";
            case "backward-right":
            return "down-right";
            default:
            return null;
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isMoveMode) return;

        if (isHoveringUI(e.target)) {
            setMoveDirection(null);
            setCamCommand(null);
            return;
        }

        if (e.button === 0) {
            setIsLeftMouseDown(true);
            setCamCommand(moveDirectionToCamCommand(moveDirection));
        }

        if (e.button === 2) {
            setCamCommand(null);
        }
    };

        const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button === 0) {
            setIsLeftMouseDown(false);
            setCamCommand(null);
        }

        if (e.button === 2) {
            setIsRightMouseDown(false);
        }
    };

    const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isHoveringUI(e.target)) return;

        e.preventDefault();

        setZoomValue(prev => {
            const zoomSpeed = 0.5;
            const nextZoom = e.deltaY > 0 ? prev - zoomSpeed : prev + zoomSpeed;
            return Math.min(10, Math.max(0, nextZoom));
        });
    };

    const isHoveringUI = (target: EventTarget | null) => {
        return target instanceof HTMLElement &&
            target.closest("button, input, select, textarea, a");
    };

    const GUI = (
        <>
        {isMoveMode && moveDirection && (
            <div
                style={{
                position: "absolute",
                left: cursorPos.x,
                top: cursorPos.y,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                fontSize: "36px",
                color: "white",
                //background: "rgba(0, 0, 0, 0.45)",
                background: "rgba(0,0,0,0)",
                borderRadius: "50%",
                padding: "8px",
                zIndex: 10,
                }}
            >
                {getMoveIcon()}
            </div>
        )}
        <button onClick={() => goFloorUp()} style={{position: "absolute", right: "2%", top: "10%"}}>Floor up</button>
        <button onClick={() => goFloorDown()} style={{position: "absolute", right: "2%", top: "19%"}}>Floor down</button>

        <div
            style={{
                position: "absolute",
                bottom: "2%",
                right: "2%"
            }}
        >
            <button onClick={() => {setCurrModel('thermite'); setIsMoveMode(false);}} style={{position: "absolute", bottom: "0px", right: "60px" ,padding: "0px"}}><img src={ThermiteLogo} style={{height: "50px", width: "50px"}} alt="Thermite" /></button>
            <button onClick={() => {setCurrModel('ace'); setIsMoveMode(false);}} style={{position: "absolute", bottom: "0px", right: "0px", padding: "0px"}}><img src={AceLogo} style={{height:"50px", width: "50px"}} alt="Ace" /></button>
            {/* move button */}
            <button onClick={() => enterMoveMode()} style={{position: "absolute", bottom: "65px", right: "0px", padding: "0px"}}>
                <HiArrowsExpand style={{height: "28px", width: "28px", margin: "10px", marginBottom: "5px", rotate: "45deg"}} />
            </button>
        
        
            <div style={{position: "absolute", bottom: "17px", right: "285px"}}><GoZoomIn style={{scale: "150%"}} /></div>
            <input 
                className="zoom-slider"
                type='range' 
                min="0" 
                max="10" 
                step=".1" 
                value={zoomValue}
                onChange={(e)=> setZoomValue(Number(e.target.value))}
            />
        </div>
          
            {/* <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('up')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "50%", top: "5%"}}><GoArrowUp /></button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('down')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "50%", bottom: "5%"}}><GoArrowDown /></button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('left')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", left: "2%", top: "50%"}}><GoArrowLeft /></button>
            <button onMouseLeave={() => setCamCommand(null)} onMouseDown={() => setCamCommand('right')} onMouseUp={() => setCamCommand(null)} style={{position: "absolute", right: "2%", top: "50%"}}><GoArrowRight /></button> */}
        </>
    )

    return (
        <div 
            onWheel={handleWheelZoom}
            onMouseMove={handleMoveModeMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                setMoveDirection(null);
                setIsLeftMouseDown(false);
                setIsRightMouseDown(false);
                setCamCommand(null);
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                display: "flex",
                position: "relative", 
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
                <CameraController command={camCommand} floor={currFloor} zoom={zoomValue} orbitEnabled={true} />
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