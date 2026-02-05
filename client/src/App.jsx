import {BrowserRouter, Router, Route, Routes} from "react-router-dom"
import HomePage from "./assets/pages/HomePage"
import DropPage from "./assets/pages/DropPage"
import GestureDetector from "./components/GestureDetector"
import { useState } from "react"

const App = () => {

  const [currentGesture, setCurrentGesture] = useState(null);
  const [gestureConfidence, setGestureConfidence] = useState(0);

  const handleGesture = (gesture, confidence) => {
    setCurrentGesture(gesture);
    setGestureConfidence(confidence);
  }

  return(
   <BrowserRouter>
   <GestureDetector onGesture = {handleGesture}/>
   <Routes>
    <Route path = "/" element = {<HomePage currentGesture={currentGesture} gestureConfidence ={gestureConfidence}/>}/>
    <Route path = "/drop" element = {<DropPage currentGesture={currentGesture} gestureConfidence ={gestureConfidence}/>}/>
   </Routes>
   </BrowserRouter>
  )
}

export default App