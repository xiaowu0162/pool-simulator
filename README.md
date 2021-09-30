# Billiards Simulator

Authors: Youchuan Hu, Zihan Liu, Yunze Long, and Di Wu

This is a billiards simulator based on the standard American 8-Ball pool game. Current, the game supports player-vs-player mode.   
To play the game:
* Start index.html and press Q to enter the game. Follow the turn indicated in the game display. 
* Use C and X to control the hitting angle, and use U and I to control the hitting force. Press H to hit.
* Wait for the balls to come to a stop naturally before the next hit.  
* After one player's foul, the other player can use Control+IJKL to adjust the position of the cue ball. 
* Use Control+number to switch between different camera views.  
* After the system indicates that one player has won, press q to reset.  
  
Winning conditions:
* One player has pocketed all the required balls in correct order (8 ball goes in last without foul).
* The other player pockets the black ball before they have pocketed other balls.  

Foul conditions (Ball-in-hand fouls):
* The cue ball is pocketed.
* The cue ball does not hit any other balls during a hit (scratch). 
* Player hits a ball outside the player's color set with cue ball as first collision at any shot.
 
 Scene Construction: 
 * We built four scenes: a start scene, a main scene, and two ending scenes that are similar to the start scene.
 * In the main scene, we placed the desk, cue, and the balls in the center. The desk, cue, and all the balls are created as 3D models in Blender with textures mapped to them.
 * We surround the table with scrolling billboards showing the UCLA logo.
 * We added a ball display feature to show which balls are on the table (active) for better visualization.
 * We also allow users to change their camera view. The default camera view is overhead at the center of the board. It could also be positioned at each of the four corners and four sides or set to trace the cue ball.  
 
As advanced features, we have implemented shadowing, collision detection, and physics based simulation.  
Physics-based simulation and collision detection:
* As the user presses the hit button, we first simulate the cue moving towards the cue ball and hitting the cue ball. 
* Whenever there are balls moving on the scene, we ensure that they do not overlap with each other by checking overlapping and handling them at each frame, such that both the collisions between balls and the rail or collision between balls are correctly handled.  
* When a ball overlaps with a pocket, we simulate its fall into the pocket. 
* We also added rotational motions, so that balls will have the rolling motion as they would in real life. 
* The collisions are modeled to be inelastic, which means that there is an energy loss at each collision. 
* The table cloth provides a frictional force that opposes the balls’ movement so that the balls can stop smoothly.

Shadowing:  
*	We implemented our own ball shadowing. It is basically a tiny graphics sphere attached to each of the balls. The position, shape and size of the shadow are calculated based on the relative position of the ball with respect to the light source, which hangs above the origin at (0, 60, 0).  In effect, when the balls are closer to the center of table, the shadowing effects will be at its minimum, as expected in real life; however, as balls approach the rails (further away from the light source), the shadows will be stretched longer, so that the shadowing effects look natural.
