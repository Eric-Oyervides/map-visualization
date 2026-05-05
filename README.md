## 3D Map Visualization with Three.js

Map visualization and navigation implementation. 
- Custom movement based on camera positon, zoom and floor level.
- Item placement into the 3D Map using raycasting, with correct orientation based on the normals of the face.
- Differentiation of "destructible" and "non-destructible" areas, making it impossible to place models into the non-destructible areas (showing the 3D model red when non placeable)
- Making 3D boolean operation to make holes to the "destructible" walls and floors. This is achieved when placing a model and clicking on "Activate" this makes the objects to create holes on the destructible areas.

Currently compatible with Chrome web browser. 
