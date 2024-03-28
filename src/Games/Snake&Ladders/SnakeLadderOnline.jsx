import React, { useEffect, useMemo, useState } from "react";
import dice1Image from "./assets/images/dice/dice1.jpeg";
import dice2Image from "./assets/images/dice/dice2.jpeg";
import dice3Image from "./assets/images/dice/dice3.jpeg";
import dice4Image from "./assets/images/dice/dice4.jpeg";
import dice5Image from "./assets/images/dice/dice5.jpeg";
import dice6Image from "./assets/images/dice/dice6.jpeg";
import Dice from "./assets/images/dice/Dice.gif";
import diceRollingSound from "./assets/sounds/diceRolling.mp3";
import ladderClimbingSound from "./assets/sounds/ladderClimbing.mp3";
import snakeBiteSound from "./assets/sounds/SnakeBite.mp3";
import successSound from "./assets/sounds/success.mp3";
import styles from "./SnakeLadders.module.css";
import io from "socket.io-client";

const socket = io("https://snakeandladders-webgame-be.onrender.com/");
const SnakeLadders = () => {
  const [playerPositions, setPlayerPositions] = useState([1, 1]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dice1Value, setDice1Value] = useState(6);
  const [dice2Value, setDice2Value] = useState(6);
  const [isDice1Rolling, setisDice1Rolling] = useState(false);
  const [isDice2Rolling, setisDice2Rolling] = useState(false);
  const [playColor, setplayColor] = useState("green");
  const [count, setcount] = useState(0);
  // Add state variables to hold the position and color of the player who got bitten
  const [snakeBitePosition, setSnakeBitePosition] = useState(null);
  const [snakeBitePlayerColor, setSnakeBitePlayerColor] = useState(null);
  const [roomNumber, setRoomNumber] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpponentFound, setIsOpponentFound] = useState(false);
  const [playerTimer, setPlayerTimer] = useState(0);
  const [CountDown, setCountDown] = useState(0);
  const playerColors = ["green", "red"];
  const playerNames = ["Green", "Red"];
  const diceSide = [
    dice1Image,
    dice2Image,
    dice3Image,
    dice4Image,
    dice5Image,
    dice6Image,
  ];
  const soundFiles = {
    diceRolling: new Audio(diceRollingSound),
    ladderClimbing: new Audio(ladderClimbingSound),
    snakeBite: new Audio(snakeBiteSound),
    success: new Audio(successSound),
  };
  const playSound = (soundName) => {
    const soundFile = soundFiles[soundName];
    if (soundFile) {
      soundFile.play();
    }
  };

  // Inside the SnakeLadders component
  const handleDiceRolling = async (user) => {
    setPlayerTimer(30);
    socket.emit("rollDice", { user, roomNumber });
  };

  // todo: BUG: after a few seconds of playing  the dice logic stops working correctly
  // ---------------------------------------------------------------------------------------------
  // Function to handle dice roll
  const rollDice = async (
    user,
    diceValue,
    currentPlayerIndex,
    roomNumber,
    playerPositions
  ) => {
    playSound("diceRolling");
    if (winner !== null) {
      console.log("Game already has a winner. Dice roll ignored.");
      return; // Don't roll dice if winner is declared
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCountDown(30);
    // const diceValue = Math.floor(Math.random() * 6) + 1;

    // setcount((prev) => prev + 1);
    // console.log("count", count);
    console.log(`Dice rolled: ${diceValue}`);

    if (user === "green") {
      setDice1Value(diceValue);
      setisDice1Rolling(false);
    } else if (user === "red") {
      setDice2Value(diceValue);
      setisDice2Rolling(false);
    }
    const currentPosition = playerPositions[user === "green" ? 0 : 1];
    const remainingSteps = 100 - currentPosition;
    console.log("currentPosition:", currentPosition);
    console.log("remainingSteps:", remainingSteps);

    // Check if the player is at position 1 and rolled a number other than 6
    if (currentPosition === 1 && diceValue !== 6) {
      console.log(
        "Player is at position 1 and didn't roll a 6. Skipping turn."
      );
      // If the player is at position 1 and did not roll a 6, they cannot move
      // Move to the next player's turn
      console.log(currentPlayerIndex);
      console.log((currentPlayerIndex + 1) % playerPositions.length);
      updateCurrentPlayerIndex(
        (currentPlayerIndex + 1) % playerPositions.length,
        roomNumber
      );
      return;
    }

    // Check if the player is standing on position 96 and rolled a number greater than the remaining steps
    if (currentPosition >= 95 && diceValue > remainingSteps) {
      console.log("Player is frozen. Skipping turn.");
      // Player is frozen, do not move
      setCurrentPlayerIndex((currentPlayerIndex + 1) % playerPositions.length);
    } else {
      // Proceed with normal movement logic
      let newPosition = currentPosition + diceValue;

      // Check if the newPosition is beyond position 100
      if (newPosition > 100) {
        console.log("Player overshoots position 100. Adjusting position.");
        // If the newPosition is beyond 100, adjust it to prevent overshooting
        newPosition = 100 - (newPosition - 100);
      }

      // Check if the player is in a position where they need an exact number to reach 100
      if (currentPosition >= 96 && newPosition > 100) {
        console.log(
          "Player needs exact number to reach 100. Restricting movement."
        );
        // If so, restrict the movement to only allow the exact number needed to reach 100
        newPosition = 100;
      }

      // Apply ladder logic
      const originalPosition = newPosition;
      newPosition = checkForLadderSnake(newPosition);
      console.log("newPosition:", newPosition);

      // Check if the player has climbed a ladder
      if (newPosition !== originalPosition && newPosition > originalPosition) {
        console.log("Player climbed a ladder!");
        // Play ladder climbing sound
        playSound("ladderClimbing");
      } else if (
        newPosition !== originalPosition &&
        newPosition < originalPosition
      ) {
        console.log("Player got bitten by a snake!");
        playSound("snakeBite");
        const bittenPlayerColor = currentPlayerIndex === 0 ? "green" : "red";
        // handleSnakeBite(newPosition, bittenPlayerColor);
      }

      const updatedPositions = [...playerPositions];
      updatedPositions[currentPlayerIndex] = newPosition;

      // Animate player movement
      // animatePlayerMovement(currentPlayerIndex, newPosition);
      socket.emit("updatePositions", { updatedPositions, roomNumber });
      // setPlayerPositions(updatedPositions);
      console.log("updatedPositions:", updatedPositions);

      // Check if any player has reached position 100
      if (updatedPositions.some((position) => position >= 100)) {
        // Find the index of the winning player
        const winningPlayerIndex = updatedPositions.findIndex(
          (position) => position >= 100
        );
        console.log(`Player ${playerNames[winningPlayerIndex]} wins!`);
        // Declare the winning player
        setWinner(winningPlayerIndex);
        setPlayerTimer(0);
        setCountDown(0);
        socket.emit("gameOver", roomNumber);
        playSound("success");
      } else {
        // Check if the player rolled a 6 or climbed a ladder
        if (diceValue === 6 || newPosition > originalPosition) {
          console.log("Player rolled a 6 or climbed a ladder. Another chance.");
          // If the player rolled a 6 or climbed a ladder, give them another chance
          return;
        }
        // Move to the next player's turn
        updateCurrentPlayerIndex(
          (currentPlayerIndex + 1) % playerPositions.length,
          roomNumber
        );
        console.log("rollDice execution END");
      }
    }
  };

  // Function to check for ladder or snake
  const checkForLadderSnake = (position) => {
    const ladders = {
      4: 56,
      12: 50,
      14: 55,
      22: 58,
      41: 79,
      54: 88,
    };
    const snakes = {
      96: 42,
      94: 71,
      75: 32,
      48: 16,
      37: 3,
      28: 10,
    };

    if (ladders[position]) {
      return ladders[position];
    } else if (snakes[position]) {
      return snakes[position];
    } else {
      return position;
    }
  };

  // Function to reset the game
  const resetGame = () => {
    setPlayerPositions([1, 1]);
    setCurrentPlayerIndex(0);
    setDice1Value(6);
    setDice2Value(6);
    setWinner(null);
    setRoomNumber(null);
    setIsSearching(false);
    setIsOpponentFound(false);
  };

  // Generate numbers from 100 to 1, with every second row reversed
  const generateNumbers = () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const row = [];
      if (i % 2 === 0) {
        for (let j = i * 10 + 1; j <= (i + 1) * 10; j++) {
          row.push(j);
        }
      } else {
        for (let j = (i + 1) * 10; j > i * 10; j--) {
          row.push(j);
        }
      }
      rows.push(row);
    }
    return rows.flat();
  };
  const numbers = useMemo(() => generateNumbers(), []);
  // ------------------------------------------
  useEffect(() => {
    console.log("currentPlayerIndex:", currentPlayerIndex);
    console.log("---------------------------------------------------------");
  }, [currentPlayerIndex]);

  // ------------------Socket io------------------------------
  const updateCurrentPlayerIndex = (index, roomNumber) => {
    // Emit the currentPlayerIndex to the server
    socket.emit("updateCurrentPlayerIndex", { index, roomNumber });
  };
  useEffect(() => {
    // Timer logic
    let timer;
    if (playerTimer > 0 && currentPlayerIndex !== null) {
      timer = setTimeout(() => {
        // Declare the opponent as the winner when timer runs out
        const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
        setWinner(opponentIndex);
        socket.emit("gameOver", roomNumber);
        playSound("success");
      }, playerTimer * 1000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [playerTimer, currentPlayerIndex, roomNumber]);

  useEffect(() => {
    let countDownTime;
    if (
      CountDown > 0 &&
      currentPlayerIndex !== null &&
      isOpponentFound &&
      winner === null
    ) {
      console.log("in timer");
      countDownTime = setInterval(() => {
        setCountDown((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
      clearInterval(countDownTime); // Clear the interval if conditions are not met
    }
    return () => {
      clearInterval(countDownTime); // Clear the interval in cleanup
    };
  }, [CountDown, currentPlayerIndex, roomNumber]);

  useEffect(() => {
    // Listen for 'find' event from the server
    socket.on("opponentFound", () => {
      setIsSearching(false);
      setCountDown(30);
      console.log(CountDown);
      setPlayerTimer(30);
      setIsOpponentFound(true);
    });

    // Listen for 'opponentDisconnected' event from the server
    socket.on("opponentDisconnected", () => {
      setIsOpponentFound(false);
      alert("opponent disconnected");
    });
    // Listen for the roomNumber event from the server
    socket.on("roomNumber", (roomNumber) => {
      setRoomNumber(roomNumber);
    });
    socket.on("playerColor", (color) => {
      setplayColor(color);
    });
    socket.on("updatedPositions", (updatedPositions) => {
      console.log(updatedPositions);
      // Update the player positions state with the received positions
      setPlayerPositions(updatedPositions);
    });
    socket.on(
      "diceRolled",
      ({
        user,
        diceValue,
        currentPlayerIndex,
        roomNumber,
        playerPositions,
      }) => {
        console.log(
          `${user} rolled the dice , Dice:${diceValue} , currentPlayerIndex: ${currentPlayerIndex} , roomNumber : ${roomNumber}`
        );
        if (user === "green") {
          setisDice1Rolling(true);
          console.log("Green");
        } else {
          setisDice2Rolling(true);
          console.log("RED");
        }
        console.log("START RollDice");
        // Update game state based on the dice roll
        rollDice(
          user,
          diceValue,
          currentPlayerIndex,
          roomNumber,
          playerPositions
        );
      }
    );
    // Listen for 'currentPlayerIndex' event from the server
    socket.on("currentPlayerIndex", (index) => {
      console.log("currentPlayerIndex index", index);
      setCurrentPlayerIndex(index); // Update the currentPlayerIndex state
    });
    socket.on("roomNumber", (roomId) => {
      // Update the room number state
      setRoomId(roomId);
    });
    // Clean up socket event listeners when component unmounts
    return () => {
      socket.off("opponentFound");
      socket.off("opponentDisconnected");
      socket.off("diceRolled");
      socket.off("currentPlayerIndex");
      socket.off("roomNumber");
      socket.off("updatedPositions");
    };
  }, []);

  const handleSearchOpponent = () => {
    setIsSearching(true);
    // Emit 'searchOpponent' event to the server
    socket.emit("searchOpponent");
  };

  // -------------------------------------------------------
  return (
    <div className={styles.container}>
      <div>{roomId && `You are in room: ${roomId}`}</div>
      {isOpponentFound && (
        <div className={styles.boardWrapper}>
          <div className={styles.backgroundImg}></div>
          <div className={styles.board}>
            {numbers.map((number, index) => (
              <div key={index} className={styles.square}>
                {/* Only render the player token if the index matches the player's position */}
                {playerPositions.map((position, playerIndex) => {
                  if (number === position) {
                    return (
                      <div
                        key={playerIndex}
                        className={styles.player}
                        style={{
                          backgroundColor: playerColors[playerIndex],
                          left: "12%",
                          bottom: "50%",
                          borderWidth: 3,
                          borderColor: "white",
                          marginLeft: playerIndex * 10, // Adjust the marginLeft based on the number of players to prevent overlapping
                        }}
                      />
                    );
                  }
                })}
              </div>
            ))}
          </div>
        </div>
      )}{" "}
      {!isOpponentFound && (
        <button onClick={handleSearchOpponent} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search Opponent"}
        </button>
      )}
      {winner === null && isOpponentFound && (
        <div className={styles.DicesWrapper}>
          <button
            onClick={() => handleDiceRolling("green")}
            disabled={
              currentPlayerIndex !== 0 ||
              isDice2Rolling ||
              isDice1Rolling ||
              playColor === "red"
            }
            className={styles.dice}
          >
            <div
              style={{
                height: 16,
                width: 16,
                backgroundColor: playerColors[0],
                borderWidth: 2,
                borderColor: "white",
                borderRadius: 4,
              }}
            />
            {!isDice1Rolling ? (
              <img
                src={diceSide[dice1Value - 1]}
                style={{ height: 34, width: 34 }}
              />
            ) : (
              <img style={{ width: 34, height: 34 }} src={Dice} />
            )}
            <h4>{currentPlayerIndex === 0 ? CountDown : 30}</h4>
          </button>
          <button
            onClick={() => handleDiceRolling("red")}
            disabled={
              currentPlayerIndex !== 1 ||
              isDice1Rolling ||
              isDice2Rolling ||
              playColor === "green"
            }
            className={styles.dice}
          >
            <div
              style={{
                height: 16,
                width: 16,
                backgroundColor: playerColors[1],
                borderWidth: 2,
                borderColor: "white",
                borderRadius: 4,
              }}
            />
            {!isDice2Rolling ? (
              <img
                src={diceSide[dice2Value - 1]}
                style={{ height: 34, width: 34 }}
              />
            ) : (
              <img style={{ width: 34, height: 34 }} src={Dice} />
            )}
            <h4>{currentPlayerIndex === 1 ? CountDown : 30}</h4>
          </button>
        </div>
      )}
      {winner !== null && (
        <h3 style={{ color: "white" }}>{playerNames[winner]} wins!</h3>
      )}
      {winner !== null && <button onClick={resetGame}>RE Start</button>}
    </div>
  );
};

export default SnakeLadders;
