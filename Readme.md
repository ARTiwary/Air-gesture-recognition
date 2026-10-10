Air Gesture Recognition

Air Gesture Recognition is a creative project that lets you transfer images across tabs or devices using hand gestures. With a simple grab-and-drop gesture, you can move images wherever you want, making the process fully contactless.

This project combines real-time gesture detection, custom gesture training, and an interactive UI, offering a futuristic and fun way to interact with your computer.

Features

Real-time gesture detection using a webcam

Custom gesture training with Teachable Machine

Intuitive React-based UI

Contactless image transfer across tabs or devices

Fully desktop-browser compatible

Technologies Used

Frontend: React

Backend: Node.js & Express

Machine Learning: Teachable Machine for gesture recognition

Others: JavaScript, HTML, CSS

Requirements

Desktop computer with a webcam

Stable internet connection

Sufficient RAM and modern browser for smooth performance

Installation

Clone the repository:

git clone https://github.com/ARTiwary/Air-gesture-recognition.git


Install dependencies for the client:

cd client
npm install


Install dependencies for the server:

cd ../server
npm install


Start the project:

Open a terminal for the server:

npm start


Open another terminal for the client:

cd client
npm run dev

Usage

Open the project in a desktop browser.

Allow access to your webcam.

Use a grab-and-drop gesture with your hand to transfer images across tabs or devices.

Enjoy a smooth, contactless image transfer experience!

Tip: Ensure good lighting and enough space for gestures to be captured accurately.

Custom Gesture Training

You can train your own gestures using Teachable Machine:

Train your gesture model.

Export the model and replace model.txt in the project.

The system will recognize your new gestures automatically.

Target Users

Students learning machine learning and gesture recognition

Developers experimenting with interactive UIs

Tech enthusiasts exploring contactless interfaces

Contribution

Contributions are welcome:

Fork the repository

Create a branch (git checkout -b feature-name)

Make your changes

Submit a pull request

Support

For issues or questions, use GitHub Issues.

License

This project is licensed under the MIT License.

Acknowledgements

Teachable Machine for gesture recognition model training

React, Node, Express for the web framework

Open-source community for inspiration and support

## Configuration and security

Copy the two example files and edit them:

    cp server/.env.example server/.env
    cp client/.env.example client/.env

- `ALLOWED_ORIGINS` (server): the exact client URLs allowed to call the API. Add your deployed client URL here.
- `FILE_SIGNING_SECRET` (server): a long random string. Generate one with `openssl rand -hex 32`.
- `VITE_API_URL` (client): where the server runs.

How sharing works: open the app on two devices, show a pairing code on one, enter it on the other. Then hold a grab gesture to send and a drop gesture to receive. Every action also has a button, so the camera is optional.

What is protected:

- Camera video is analysed in the browser and never uploaded.
- Devices pair with a single-use code that expires after 5 minutes; the API needs a per-device token.
- Uploads are limited to 5 MB, checked by file content (not name), and held only in server memory. They are never written to disk.
- Received images are served only through signed links that expire, and only after the receiver claims them.
- Images are dropped from memory after 10 minutes or when either device unpairs.
- The API uses helmet, an origin allow-list and rate limits.

Nothing is stored long-term. Sessions, pairs and images live only in memory, and the browser keeps the session token in page memory (no localStorage or cookies). Reloading a page starts a new session, so pair again, ideally by scanning the QR code. A server restart clears everything.

## Architecture

    Browser A (camera + model run locally)          Browser B
       |  REST (Bearer token)   \                   /  REST
       v                         v                 v
    +-----------------------------------------------------+
    |  Express + Socket.IO server (all state in memory)   |
    |  sessions | pairing codes | images in RAM | signing |
    +-----------------------------------------------------+
       ^  realtime events: paired, incoming, reaction ...  ^
       +---------------------- Socket.IO -----------------+

Video never leaves the browser. Only the picture you choose to send reaches the server, and only the paired device can fetch it.

## Tests and Docker

    cd server && npm test            # starts the API on port 5055 and checks pairing, uploads and signed links
    export FILE_SIGNING_SECRET=$(openssl rand -hex 32)
    docker compose up --build        # client on :8080, server on :5000

GitHub Actions (`.github/workflows/ci.yml`) runs the server tests and the client lint and build on every push.
