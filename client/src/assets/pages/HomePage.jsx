import { useState } from "react";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

const HomePage = ({ currentGesture, gestureConfidence }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handelImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {
        !imagePreview ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Image Transfer
            </h1>

            <p className="text-gray-600 mb-6 text-center ">
              Select an image, then make a <strong>"GRAB"</strong> gesture
            </p>

            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors bg-indigo-50 hover:bg-indigo-100">
              <Upload className="w-16 h-1/6 text-indigo-400 mb-4" />
              <span>Click to select image</span>

              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handelImageSelect}
              />
            </label>

            <Link
              to={"/drop"}
              className="mt-6 w-fit flex items-center justify-center gap-2 text-gray-600 underline py-2 text-xs rounded-xl transition-colors"
            >
              Go to DropPage
            </Link>
          </div>
        ) : (
          <div className="relative w-full h-screen ">
            <img src={imagePreview} alt = "Selected image" className="w-full h-full object-contain"/>
          </div>
        )
      }
    </div>
  );
};

export default HomePage;
