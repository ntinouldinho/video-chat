import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import "../CSS/Room.css";
import { useHistory } from "react-router-dom";
// import screen from "../assets/screen.png";
// import mute from "../assets/mute.png";
// import camera from "../assets/video-camera.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVideo,
  faVideoSlash,
  faWindowClose,
  faMicrophone,
  faMicrophoneSlash,
  faPhoneSlash,
} from "@fortawesome/free-solid-svg-icons";
import { faChromecast } from "@fortawesome/free-brands-svg-icons";
import { console, MediaDeviceInfo } from "globalthis/implementation";
import Swal from 'sweetalert2'
import Rating from "react-star-review";
// import {getCookie} from "../components/readCookie.js"
// import console from "node:console";

const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUser = useRef();
    const userStream = useRef();
    const senders = useRef([]);
    const [first, setFirst] = useState(false);
    const [mute, setMute] = useState(true);
    const [camera, setCamera] = useState(true);
    const [screen, setScreen] = useState(false);

  useEffect(() => {
    
      navigator.mediaDevices
      .getUserMedia({ audio: mute, video: camera })
      .then((stream) => {
        userVideo.current.srcObject = stream;
        userStream.current = stream;
        
        console.log(mute);
        if(!first){
          socketRef.current = io.connect("/");
          console.log("started");
          socketRef.current.emit("join room", props.match.params.roomID);
          setFirst(true);
          dragElement();

          socketRef.current.on("other user", (userID) => {
            console.log("other user " + userID);
            callUser(userID);
            otherUser.current = userID;
            console.log(first);
          });

          socketRef.current.on("no user", (userID) => {
              console.log("first user " + userID);
              
          });

          socketRef.current.on("user joined", (userID) => {
            console.log("user joined");
            otherUser.current = userID;
          });
        
          socketRef.current.on("offer", handleRecieveCall);

          socketRef.current.on("answer", handleAnswer);

          socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
        }
      });

    // window.addEventListener("beforeunload", (ev) => 
    // {  
    //     ev.preventDefault();
    //     return ev.returnValue = 'Are you sure you want to close?';
    // });

    const interval = setInterval(() => {

      try{
        fetch(`/api/decode`)
        .then(response =>response.json())
        .then(json => {
          const link = window.location.href.split('/');
          const appointment_id = link[link.length-1];
          

          let header = new Headers();
          header.append('Accept', 'application/json');

          let init = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body:JSON.stringify({
                id:appointment_id,
                role:json.role
              })
          }


          fetch("/api/appointments/time",init)
          .then(response=> console.log(response))
          
        });
        
      }catch(e){
        alert(e)
      }
      
    
    }, 10000);

    return () => {
      console.log(`clearing interval`);
      clearInterval(interval);
    };


  }, [callUser, handleRecieveCall, dragElement, camera, mute, first, props.match.params.roomID]);

  function callUser(userID) {
    peerRef.current = createPeer(userID);
    userStream.current
      .getTracks()
      .forEach((track) =>
        senders.current.push(
          peerRef.current.addTrack(track, userStream.current)
        )
      );
  }

  function muter(){
    setMute(!mute);
    userStream.current.getTracks()[0].enabled = !mute;
    console.log(userStream.current.getTracks()[0]);
  }

  function createPeer(userID) {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });

    peer.onicecandidate = handleICECandidateEvent;
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

    console.log(peer);
    return peer;
  }

  function handleNegotiationNeededEvent(userID) {
    peerRef.current
      .createOffer()
      .then((offer) => {
        return peerRef.current.setLocalDescription(offer);
      })
      .then(() => {
        const payload = {
          target: userID,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription,
        };
        socketRef.current.emit("offer", payload);
      })
      .catch((e) => console.log(e));
  }

  function handleRecieveCall(incoming) {
    peerRef.current = createPeer();
    const desc = new RTCSessionDescription(incoming.sdp);
    peerRef.current
      .setRemoteDescription(desc)
      .then(() => {
        userStream.current
          .getTracks()
          .forEach((track) =>
          senders.current.push(
            peerRef.current.addTrack(track, userStream.current) )
          );
      })
      .then(() => {
        return peerRef.current.createAnswer();
      })
      .then((answer) => {
        return peerRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incoming.caller,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription,
        };
        socketRef.current.emit("answer", payload);
      });
  }

  function handleAnswer(message) {
    const desc = new RTCSessionDescription(message.sdp);
    peerRef.current.setRemoteDescription(desc).catch((e) => console.log(e));
  }

  function handleICECandidateEvent(e) {
    if (e.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: e.candidate,
      };
      socketRef.current.emit("ice-candidate", payload);
    }
  }

  function handleNewICECandidateMsg(incoming) {
    const candidate = new RTCIceCandidate(incoming);

    peerRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
  }

  function handleTrackEvent(e) {
    partnerVideo.current.srcObject = e.streams[0];
  }

  function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];

      senders.current.find((sender) => sender.track.kind === "video").replaceTrack(screenTrack);

    //   userVideo.current = senders.current;

      screenTrack.onended = function () {
        senders.current.find((sender) => sender.track.kind === "video").replaceTrack(userStream.current.getTracks()[1]);
        // userVideo.current = stream;
      };
    });
  }


  function getCookie(name) {
    console.log("innn")
    // Split cookie string and get all individual name=value pairs in an array
    var cookieArr = document.cookie.split(";");
    
    // Loop through the array elements
    for(var i = 0; i < cookieArr.length; i++) {
        var cookiePair = cookieArr[i].split("=");
        console.log( cookiePair)
        /* Removing whitespace at the beginning of the cookie name
        and compare it with the given string */
        if(name == cookiePair[0].trim()) {
            // Decode the cookie value and return
            return decodeURIComponent(cookiePair[1]);
        }
    }
    
    // Return null if not found
    return null;
}

  
  async function hangUpCall(){
    
    let json = null;
    
    try{
      const response = await fetch(`/api/decode`);
      json = await response.json();
    }catch(e){
      alert(e)
    }
    
    const stripe_id = json.stripe_id;
    const link = window.location.href.split('/');
    const appointment_id = link[link.length-1];

    let appointmentData = null;

    await fetch(`/api/appointment/${appointment_id}`)
          .then(response => response.json())
          .then(response => appointmentData=response)

    console.log("fffffffffffffffffffffffffffff")
    console.log(appointmentData)
    if(json.role === "user"){
      
      fetch('/api/stripe/createPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            id: stripe_id, 
            price: appointmentData.price,
            appointment: appointment_id
          }),
      })
      .then(res => {
          if (res.status === 200) {
            // new Swal({
            //   title: "Leave a review",
            //   text: "Write some thoughts about the expert to help out others",
            //   input: "text",
            //   showCancelButton: true,
            //   inputPlaceholder: "Write something"
            // })
            Swal.fire('Payment was successful!', '', 'success')

            Swal.fire({
              title: 'Review Form',
              html:  `<h1 id="demo">Rating: 1</h1>
                      <input type="range" min="1" max="5" value="1" step="1" class="slider" id="myRange">
                      <h1>Review:</h1> 
                      <textarea rows="5" cols="20" placeholder="Leave your review here..." id="textReview"></textarea>`,
              confirmButtonText: 'Submit',
              focusConfirm: false,
              willOpen: () => {
                var slider = document.getElementById("myRange");
                var output = document.getElementById("demo");
                output.innerHTML = slider.value; // Display the default slider value

                // Update the current slider value (each time you drag the slider handle)
                slider.oninput = function() {
                  output.innerHTML = "Rating: "+this.value;
                }
              },
              preConfirm: () => {
                const rating = Swal.getPopup().querySelector('#myRange').value
                const review = Swal.getPopup().querySelector('#textReview').value
                
                return { rating: rating, review:review }
              }
            }).then((result) => {
              fetch('/api/appointment/review', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                      appointment: appointment_id,
                      review: result.value.review,
                      customer: json.name,
                      rating: result.value.rating,
                      expert: appointmentData.expert
                    }),
                }).then((response) => {
                  Swal.fire('Saved!', '', 'success')
                  window.location.href = "/"
                })
            })
            //   preConfirm: () => {
            //     const login = document.getElementById('text-review').value
            //     const password = document.getElementById('myRange').value
                
            //     console.log(login)
            //     return { login: login, password: password } }
            //   })          
            // .then((result) => {
            //   console.log(result)
            //   if (result.isConfirmed) {
            //     fetch('/api/appointment/review', {
            //       method: 'POST',
            //       headers: {
            //         'Content-Type': 'application/json',
            //       },
            //       body: JSON.stringify({ 
            //           appointment: appointment_id,
            //           review: document.getElementById("text-review").value,
            //           customer: json.name,
            //           rating: document.getElementById("myRange").value
            //         }),
            //     }).then((response) => {
            //       Swal.fire('Saved!', '', 'success')
            //     })
                
            //   } else if (result.isDenied) {
            //     Swal.fire('Changes are not saved', '', 'info')
            //   }
              
            // });
            // window.location.href = "/"
          } else {
            const error = new Error(res.error);
            throw error;
          }
        })
        .catch(err => {
          console.error(err);
          alert('Error, could not process payment');
        });
    }else{
      window.location.href = "/"
    }
    

  }

  /*---------------Make small camera movable----------------*/

  function dragElement() {
    var elmnt = document.getElementById("myVideo");
    // console.log(elmnt);
    var pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    if (elmnt) {
      elmnt.onmousedown = dragMouseDown;
    }
    // }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = elmnt.offsetTop - pos2 + "px";
      elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // function setMute(mute) {
  //   let icon = mute ? "faMicrophone" : "faMicrophoneSlash";
  // }

  const history = useHistory();
  return (
    <div className="room-container">
      <div className="video-container">
        <video
          id="partnerVideo"
          className="imageDiv topDiv "
          autoPlay
          controls
          ref={partnerVideo}
        />
        <video
          id="myVideo"
          className="imageDiv bottomDiv"
          muted="muted"
          autoPlay
          controls
          ref={userVideo}
        />
        <div className="room-buttons">
          
          <button
            id="mutebtn"
            onClick={() => {
                muter();
            }}
          >
            <FontAwesomeIcon icon={mute ? faMicrophone : faMicrophoneSlash} />
          </button>
          <button
            id="screensharebtn"
            onClick={() => {
              // alert("COMING SOON...")
              setScreen(!screen);
              if (!screen) {
                shareScreen();
              }
            }}
          >
            <FontAwesomeIcon icon={screen ? faWindowClose : faChromecast} />
          </button>
          <button id="closebtn">
            <FontAwesomeIcon
              icon={faPhoneSlash}
              onClick={() => {
                hangUpCall()
              }}
            />
          </button>
        </div>
      </div>

      <div id="chat">
        <header>
          <h1>FindExpert Chat</h1>
          {/* <SignOut /> */}
        </header>

        <section>{<ChatRoom roomID={props.match.params.roomID} />}</section>
      </div>
      {/* <div className="room-bottom">hello</div> */}
    </div>
  );
};

// function SignOut() {
//   return (
//     auth.currentUser && (
//       <button className="sign-out" onClick={() => auth.signOut()}>
//         Sign Out
//       </button>
//     )
//   );
// }

function ChatRoom(props) {
  const socketChat = useRef();
  const otherUserChat = useRef();
  const [yourID, setYourID] = useState();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    //----------chat-----
    socketChat.current = io.connect("/"); //not correct but close

    socketChat.current.emit("join chat", props.roomID);

    socketChat.current.on("other user chat", (userID) => {
      console.log("other user chat " + userID);
      otherUserChat.current = userID;
    });

    socketChat.current.on("your id", (id) => {
      setYourID(id);
    });

    socketChat.current.on("message", (message) => {
      console.log("here");
      receivedMessage(message);
    });
  }, [props.roomID]);

  // ----------------Chat Stuff---------------

  function receivedMessage(message) {
    setMessages((oldMsgs) => [...oldMsgs, message]);
  }

  function sendMessage(e) {
    e.preventDefault();
    const messageObject = {
      body: message,
      id: yourID,
    };
    setMessage("");
    socketChat.current.emit("send message", messageObject);
  }

  function handleChatChange(e) {
    setMessage(e.target.value);
  }

  // ----------------End Chat Stuff----------------

  return (
    <>
      <main>
        {messages.map((message, index) => {
          return (
            <ChatMessage
              key={index}
              message={message.body}
              flag={message.id === yourID}
            />
          );
        })}
      </main>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          onChange={handleChatChange}
          placeholder="Say something..."
        />
        <button type="submit"> 📝 </button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const messageClass = props.flag === true ? "sent" : "received";

  return (
    <>
      <div className={`message ${messageClass}`}>
        <img alt="chatter"
          src={
            "https://p.kindpng.com/picc/s/24-248325_profile-picture-circle-png-transparent-png.png"
          }
        />
        <p> {props.message} </p>
      </div>
    </>
  );
}
export default Room;
