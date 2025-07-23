import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, SoftShadows, useGLTF, useHelper } from '@react-three/drei';
import { useState, useRef, Suspense, useEffect, forwardRef, useCallback } from 'react';
import { Map } from './Map';
import type { MapRef } from './Map';


type ModelPlacerProps = {
    mapRef : React.RefObject<MapRef | null>;
    modelName : string
}

export function ModelPlacer({ mapRef, modelName }: ModelPlacerProps) {
    //const modelName = "termite";

    const { camera, gl, scene } = useThree();
    const rayCaster = useRef(new THREE.Raycaster());
    const initMouse = useRef(new THREE.Vector2());
    const mousePos = useRef(new THREE.Vector2());
    const pointer = useRef(new THREE.Vector2());

    const handlePointerMove = useCallback((event : MouseEvent) => {
        const rect = gl.domElement.getBoundingClientRect();
        pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }, [gl])

    useFrame(() => {
        rayCaster.current.layers.set(0);
        rayCaster.current.setFromCamera(pointer.current, camera);
        const intersects = rayCaster.current.intersectObjects(scene.children, true);

        if (intersects.length > 0 && mapRef.current) {
            //calculate rotation
            const intersection = intersects[0];
            const normal = intersection.face?.normal.clone();
            normal?.applyMatrix3(new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld));
            normal?.normalize();

            const up = new THREE.Vector3(0,0,1);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal!);
            if (intersects[0].object.name === 'walls_destructible'){
                mapRef.current.placeHologramAtPosition(modelName, intersects[0].point, quaternion, true);
            }
            else {
                mapRef.current.placeHologramAtPosition(modelName, intersects[0].point, quaternion, false);
            }
                
            }
    });

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            initMouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            initMouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        function handleMouseUp(event: MouseEvent) {
            const rect = gl.domElement.getBoundingClientRect();
            mousePos.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mousePos.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            if (Math.abs(initMouse.current.x - mousePos.current.x) > 0.003 ||
                Math.abs(initMouse.current.y - mousePos.current.y) > 0.003){
                    return;
            }

            rayCaster.current.layers.set(0);
            rayCaster.current.setFromCamera(mousePos.current, camera);
            const intersects = rayCaster.current.intersectObjects(scene.children, true);


            if (intersects.length > 0 && mapRef.current) {
                if (intersects[0].object.name === 'walls_destructible'){

                    //calculate rotation
                    const intersection = intersects[0];
                    const normal = intersection.face?.normal.clone();
                    normal?.applyMatrix3(new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld));
                    normal?.normalize();

                    const up = new THREE.Vector3(0,0,1);
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal!);

                    mapRef.current.placeModelAtPosition(modelName, intersects[0].point, quaternion);
                }
                
            }
        }
        gl.domElement.addEventListener('mousedown', handleMouseDown);
        gl.domElement.addEventListener('mouseup', handleMouseUp);
        gl.domElement.addEventListener('pointermove', handlePointerMove);

        return () => {
            gl.domElement.removeEventListener('mousedown', handleMouseDown);
            gl.domElement.removeEventListener('mouseup', handleMouseUp);
            gl.domElement.removeEventListener('pointermove', handlePointerMove);
        }

    },[camera, gl, scene, mapRef, modelName])
    return (
        null
    )
}