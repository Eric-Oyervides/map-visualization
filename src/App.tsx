import { Visualization } from './Components/Visualization';
import './App.css'

function App() {
  

  return (
    <>
      <div 
        style={{
          display:"flex", 
          width: "90%", 
          height:"90%", 
          justifyContent:"center", 
          alignItems:"center", 
          flex:"1 1 auto",
          padding: "30px"
        }}
      >
        <Visualization />
      </div>
    </>
  )
}

export default App
