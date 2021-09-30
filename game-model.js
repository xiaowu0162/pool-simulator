import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;


// Snooker (unit: cm)
export let BALL_RADIUS = 8.5/2.0
export let DESK_INNER_LENGTH = 356.9    // along x axis
export let DESK_INNER_WIDTH = 177.8     // along z axis
export let DESK_OUTER_LENGTH = 386.9    
export let DESK_OUTER_WIDTH = 207.8     
export let NUM_OBJECT_BALLS = 15
export let POCKET_SHIFT = 4.5;

//export let STEP_SIZE = BALL_RADIUS*2;
export let X_DIAMOND = DESK_INNER_LENGTH/8; //along x direction
export let Z_DIAMOND = DESK_INNER_WIDTH/4; //along z direction

export let POCKET_RADIUS = 2.1*BALL_RADIUS
export let POCKET_DEPTH = 10
export let POCKET_LOCATION = [[0, -DESK_INNER_WIDTH / 2 -POCKET_SHIFT*1.5], [0, DESK_INNER_WIDTH / 2 + POCKET_SHIFT*1.5], 
                              [DESK_INNER_LENGTH / 2 +POCKET_SHIFT, -DESK_INNER_WIDTH / 2 -POCKET_SHIFT], 
                              [DESK_INNER_LENGTH / 2 +POCKET_SHIFT, DESK_INNER_WIDTH / 2 +POCKET_SHIFT], 
                              [- DESK_INNER_LENGTH / 2 -POCKET_SHIFT, -DESK_INNER_WIDTH / 2 -POCKET_SHIFT], 
                              [-DESK_INNER_LENGTH / 2 -POCKET_SHIFT, DESK_INNER_WIDTH / 2 +POCKET_SHIFT]]; 

export let FRICTIONAL_COEFFICIENT = 0.005

// Colors
export let white = hex_color("#ffffff");
export let black = hex_color("#000000");
export let red = hex_color("#c61010");
export let green = hex_color("#00FF00");
export let brown = hex_color("#8B4513");
export let blue = hex_color("#0000FF");
export let yellow = hex_color("#FFFF00");
export let orange = hex_color("#FFA500");
export let purple = hex_color("#A45EE5");
export let shade_color = hex_color("#006400");
export let wooden_brown = hex_color("#855E42");
export let init_v_max = 800;
export let init_v_min = 15;
// ball ordering: 0: cue ball, 1-7: color balls, 8: black ball, 9-15: stripe balls
//export var color_array = [white, yellow, blue, red, purple, orange, green, brown, yellow, blue, red, purple, orange, green, brown];

export class GameModel {
    constructor(is_eight_ball=true) {
        // initialize balls
        this.stats = new GameStatistics(is_eight_ball)
        this.balls = Array(NUM_OBJECT_BALLS+2)
        this.initialize_balls()
        this.all_balls_stationary = true
        this.selection_stage = true
        this.hit_selection = new HitSelection()
        this.hit_selection_cached = this.hit_selection
        this.handle_foul = true;
    }

    initialize_balls() {
        let STEP_SIZE = BALL_RADIUS*2;
        
        // the cue ball
        this.balls[0] = new Ball(-2* X_DIAMOND, 15, white, true, 0, true);

        // color balls
        this.balls[1] = new Ball(1.5*X_DIAMOND, 0, yellow, true, 0, false);
        this.balls[2] = new Ball(1.5*X_DIAMOND+3*STEP_SIZE, 2*BALL_RADIUS, blue, true, 0, false);
        this.balls[3] = new Ball(1.5*X_DIAMOND+STEP_SIZE, BALL_RADIUS, red, true, 0, false);
        this.balls[4] = new Ball(1.5*X_DIAMOND+3*STEP_SIZE, -BALL_RADIUS, purple, true, 0, false);
        this.balls[5] = new Ball(1.5*X_DIAMOND+4*STEP_SIZE, 1.5*BALL_RADIUS, orange, true, 0, false);
        this.balls[6] = new Ball(1.5*X_DIAMOND+4*STEP_SIZE, -2.5*BALL_RADIUS, green, true, 0, false);
        this.balls[7] = new Ball(1.5*X_DIAMOND+2*STEP_SIZE, -1.5*BALL_RADIUS, brown, true, 0, false);

        // black ball: Must be at this position
        this.balls[8] = new Ball(1.5*X_DIAMOND+2*STEP_SIZE, 0, black, true, 0, false);
        
        // stripe balls
        
        this.balls[9] = new Ball(1.5*X_DIAMOND+3*STEP_SIZE, BALL_RADIUS, yellow, true, 0, false);
        this.balls[10] = new Ball(1.5*X_DIAMOND+STEP_SIZE, -BALL_RADIUS, blue, true, 0, false);
        this.balls[11] = new Ball(1.5*X_DIAMOND+3*STEP_SIZE, -2*BALL_RADIUS, red, true, 0, false);

        this.balls[12] = new Ball(1.5*X_DIAMOND+4*STEP_SIZE, 2.5*BALL_RADIUS, purple, true, 0, false);
        this.balls[13] = new Ball(1.5*X_DIAMOND+2*STEP_SIZE, 1.5*BALL_RADIUS, orange, true, 0, false);
        this.balls[14] = new Ball(1.5*X_DIAMOND+4*STEP_SIZE, 0, green, true, 0, false);
        this.balls[15] = new Ball(1.5*X_DIAMOND+4*STEP_SIZE, -1.5*BALL_RADIUS,brown, true, 0, false);

        // placeholder ball for hitting simulation
        this.balls[16] = new Ball(0, 0, white, true, 0, false, false, false);
        this.balls[16].is_active = false;
    }

    // the main update function called every frame
    forward(dt) {
        this.check_winning()

        /////////////////////////////////////
        // Update parameters for animation
        /////////////////////////////////////
        this.resolve_collision()
        for(let i=0; i<NUM_OBJECT_BALLS+2; i++) {
            if(!this.stats.color_set) {
                this.initialize_color_for_side(i)
            }
            this.balls[i].handle_move(dt)
        }
        this.check_all_balls_stationary()

        ///////////////////////////////
        // Handling Foul Conditions
        ///////////////////////////////
        // Check if cue ball is in the pocket
        if(!this.balls[0].is_active) {
            this.stats.foul = true;
        }
        if(this.all_balls_stationary) {
            if (!this.selection_stage) {
                // If the cue ball hasn't hit any balls in this turn, set foul = true
                if(this.stats.first_hit == 0 || !this.balls[0].is_active) {
                    this.stats.foul = true;
                }
                // If there is a foul, update the stats accordingly
                if(this.stats.foul) {
                    if(this.stats.player_1_turn) {
                        this.stats.player_1_foul += 1;
                    } else {
                        this.stats.player_2_foul += 1;
                    }
                }
                this.stats.player_1_turn = !this.stats.player_1_turn;
            }

            this.selection_stage = true
            this.stats.first_hit = 0;         
        }
        // If a foul is detected, reset the cue ball when the selection_stage is on
        if(this.stats.foul && this.selection_stage) {
            this.balls[0] = new Ball(-2* X_DIAMOND, 15, hex_color("#ffffff"), true, 0, true);
            // this.resetCueBall()
            this.handle_foul = true;
            this.stats.foul = false;
        }
    }

    initialize_color_for_side(i) {
        if(i !== 0 && i !== 16 && !this.balls[i].is_active) {
            this.stats.color_set = true;
            if(this.stats.player_1_turn) {
                if(1 <= i && i <= 7) {
                    this.stats.player_1_color = 1;
                    this.stats.player_2_color = 2;
                } else if(9 <= i && i <= 15) {
                    this.stats.player_1_color = 2;
                    this.stats.player_2_color = 1;
                }
            } else {
                if(1 <= i && i <= 7) {
                    this.stats.player_1_color = 2;
                    this.stats.player_2_color = 1;
                } else if(9 <= i && i <= 15) {
                    this.stats.player_1_color = 1;
                    this.stats.player_2_color = 2;
                }
            }
        }
    }

    check_winning() {
        // Check winning conditions
        let colorClear = true;
        let stripeClear = true;

        for(let i = 1; i <= 7; i++) {
            if(this.balls[i].is_active) {
                colorClear = false;
            }
        }
        for(let i = 9; i <= 15; i++) {
            if(this.balls[i].is_active) {
                stripeClear = false;
            }
        }

        if((this.stats.player_1_color === 1 && colorClear) || (this.stats.player_1_color === 2 && stripeClear)) {
            this.stats.player_1_black_eight = true;
        }

        if((this.stats.player_2_color === 1 && colorClear) || (this.stats.player_2_color === 2 && stripeClear)) {
            this.stats.player_2_black_eight = true;
        }

        // When 8th ball is pocketed, determin which player wins.
        if(!this.balls[8].is_active) {
            if(this.stats.player_1_turn && this.stats.player_1_black_eight && !this.foul) {
                this.stats.winner = 1;
            } else if(!this.stats.player_1_turn && this.stats.player_2_black_eight && !this.foul) {
                this.stats.winner = 2;
            } else {
                if(this.stats.player_1_turn) {
                    this.stats.winner = 2;
                } else {
                    this.stats.winner = 1;
                }
            }
        }
    }

    check_all_balls_stationary() {
        this.all_balls_stationary = true
        for(let i=0; i<NUM_OBJECT_BALLS+2; i++) {
            if(this.balls[i].is_active && (this.balls[i].v_x !== 0 || this.balls[i].v_z !== 0)) {
                this.all_balls_stationary = false
                break
            }
        }
    }

    resolve_collision() {
        // Check positions of balls pairwise, and update the balls' velocity if they collide
        // Also, prevent the balls from overlapping with each other
        this.collision_flag = 1;
        for(let i=0; i<NUM_OBJECT_BALLS+1; i++) {
            if(!this.balls[i].is_active) {
                continue
            }
            for(let j=i+1; j<NUM_OBJECT_BALLS+2; j++) {
                if(!this.balls[j].is_active) {
                    continue
                }
                if(j === NUM_OBJECT_BALLS+1 && i !== 0) {
                    continue
                }
                // use balls[i] as reference
                let dx = this.balls[j].x - this.balls[i].x
                let dz = this.balls[j].z - this.balls[i].z
                let dist = Math.sqrt(dx**2 + dz**2)
                if(dist < 2*BALL_RADIUS) {
                    // check the first hit color
                    if(i === 0 && j !== 16 && !this.stats.first_hit) {
                        this.stats.first_hit = 1;
                        if(this.stats.player_1_turn) {
                            if(this.checkColorFoul(this.stats.player_1_color, j)) {
                                this.stats.foul = true;
                            }
                        } else {
                            if(this.checkColorFoul(this.stats.player_2_color, j)) {
                                this.stats.foul = true;
                            }
                        }
                    }
                    if(j === NUM_OBJECT_BALLS+1) {
                        this.balls[i].v_x = this.balls[j].v_x
                        this.balls[i].v_z = this.balls[j].v_z
                        this.balls[j].v_x = 0
                        this.balls[j].v_z = 0
                        this.balls[j].is_active = false
                        continue
                    }
                    let fraction_x = dx / dist
                    let fraction_z = dz / dist
                    // resolve overlapping
                    let contact_x = (this.balls[i].x + this.balls[j].x) / 2
                    let contact_z = (this.balls[i].z + this.balls[j].z) / 2
                    this.balls[i].x = contact_x - fraction_x * BALL_RADIUS
                    this.balls[i].z = contact_z - fraction_z * BALL_RADIUS
                    this.balls[j].x = contact_x + fraction_x * BALL_RADIUS
                    this.balls[j].z = contact_z + fraction_z * BALL_RADIUS
                    // calculate new speed
                    let acc = (this.balls[i].v_x - this.balls[j].v_x) * fraction_x + (this.balls[i].v_z - this.balls[j].v_z) * fraction_z
                    if(j !== NUM_OBJECT_BALLS+1) {
                        acc *= 0.85
                    }
                    let acc_x = acc * fraction_x
                    let acc_z = acc * fraction_z
                    this.balls[i].v_x -= acc_x
                    this.balls[i].v_z -= acc_z
                    this.balls[j].v_x += acc_x
                    this.balls[j].v_z += acc_z
                }
            }
        }
    }

    checkColorFoul(color, ballNum) {
        if(color === 2 && (1 <= ballNum && ballNum <= 7)) {
            return true;
        } else if(color === 1 && (9 <= ballNum && ballNum <= 15)) {
            return true;
        } else {
            return false;
        }
    }

    resetCueBall() {
        this.balls[0] = new Ball(-2* X_DIAMOND, 15, white, true, 0, true);
    }
}

export class Ball {
    constructor(x_pos,z_pos,ball_color, is_active, score, is_cue=false, is_falling=false, true_ball=true){
        this.x = x_pos                  // cm
        this.y = 0
        this.z = z_pos
        this.v_x = 0      // cm/s
        this.v_y = 0              
        this.v_z = 0
        this.v_x_prev = 0
        this.v_z_prev = 0
        this.v_x_over_z = 0
        this.is_cue = is_cue
        this.ball_color = ball_color
        this.is_active = is_active
        this.is_falling = is_falling
        this.score = score
        this.falling_pocket = 0
        this.rotation_axis = [this.v_x, this.v_y];
        this.t = 0;
        this.pre_angle = 0;
        this.rotation_angle = 0
        this.true_ball = true_ball
        this.collision_flag = 0
        this.nochange_flag = 0
        this.x_dir = 0
        this.z_dir = 0
    }

    handle_move(dt) {
        // dt: s
        this.check_active_or_falling()
        if(this.is_active) {
            this.update_velocity(dt)
            this.update_position(dt)
        }
        else if (this.is_falling) {
            this.update_velocity_falling(dt)
            this.update_position_falling(dt)
        }
        let v = Math.sqrt(this.v_x**2 + this.v_z**2 + this.v_y**2)
        if(v>5 || !this.collision_flag)
            this.update_rotation(dt)

        // update v_x_over_z, v_x_prev, and v_z_prev for rotation
        if(this.v_x !== 0 && this.v_z !== 0) {
            this.v_x_over_z = Math.abs(this.v_x / this.v_z)
        }
        if(this.v_x !== 0) {
            this.v_x_prev = this.v_x
        }
        if(this.v_z !== 0) {
            this.v_z_prev = this.v_z
        }
    }

    distance(x, y, dx, dy) {
        return Math.sqrt((x - dx)**2 + (y - dy)**2);
    }

    check_active_or_falling() {
        // Check the y coordinate of a ball.
        // If the y is small enough, set this.is_falling to false
        if (this.y <= -30)
            this.is_falling = false;
        // Check the distance between this ball and each of the 6 pockets.
        // Set this.is_falling to true and this.is_active to false if the distance is less or equal to pocket raduis.
        for (let i = 0; i < POCKET_LOCATION.length; i ++) {
            let dist = this.distance(this.x, this.z, POCKET_LOCATION[i][0], POCKET_LOCATION[i][1]);
            if((dist <= POCKET_RADIUS && i <= 1) || (dist <= POCKET_RADIUS+POCKET_SHIFT*0.5 && i > 1)) {
                this.is_falling = true;
                this.is_active = false;
                this.falling_pocket = i;               
            }
        }
    }

    update_velocity_falling(dt) {
        // Calculate the falling object's collision with pocket, and include energy loss in collision
        if(!this.true_ball) {
            return
        }
        let dist = this.distance(this.x, this.z, POCKET_LOCATION[this.falling_pocket][0], POCKET_LOCATION[this.falling_pocket][1]);
        if (dist >= POCKET_RADIUS/2 && (this.v_x !== 0 || this.v_z !== 0)) { // If the ball actively touches pocket wall
            this.v_x *= -0.9
            this.v_z *= -0.9
        }

        // update falling speed
        if (this.y > -30) { // not yet touches bottom
            let acc = -980 * dt;
            this.v_y += acc
        }
        else
            this.v_y = 0;

                // calculate frictional forces
        let acc = FRICTIONAL_COEFFICIENT * 980 * dt     // mu * g * dt
        let acc_x = 0
        let acc_z = 0
        if(this.v_x === 0 || this.v_z === 0) {
            acc_x = acc_z = acc
        }
        else {
            acc_x = acc * Math.abs(this.v_x) / (Math.abs(this.v_x) + Math.abs(this.v_z))
            acc_z = acc * Math.abs(this.v_z) / (Math.abs(this.v_x) + Math.abs(this.v_z))
        }

        let vx_new = 0
        let vz_new = 0
        if(this.v_x < 0) {
            vx_new = this.v_x + acc_x
        }
        else if (this.v_x > 0) {
            vx_new = this.v_x - acc_x
        }
        if(this.v_z < 0) {
            vz_new = this.v_z + acc_z
        }
        else if (this.v_z > 0) {
            vz_new = this.v_z - acc_z
        }
        if(this.v_x * vx_new <= 0) {    // original speed or new speed is zero
            this.v_x = 0
        }
        else {
            this.v_x = vx_new
        }
        if(this.v_z * vz_new <= 0) {
            this.v_z = 0
        }
        else {
            this.v_z = vz_new
        }
    }

    update_position_falling(dt) {
        this.x += this.v_x * dt;
        this.y += this.v_y * dt;
        this.z += this.v_z * dt;
        let pkt_num = this.falling_pocket

        if(this.true_ball) {
            // Prevent insersection of ball and pocket
            let dist = this.distance(this.x, this.z, POCKET_LOCATION[pkt_num][0], POCKET_LOCATION[pkt_num][1])
            if (dist >= POCKET_RADIUS/2) { //overlap
                let dx = this.x - POCKET_LOCATION[pkt_num][0];
                let dz = this.z - POCKET_LOCATION[pkt_num][1];
                let fraction_x = dx / dist;
                let fraction_z = dz / dist;
                this.x -= fraction_x * (dist - POCKET_RADIUS/2);
                this.z -= fraction_z * (dist - POCKET_RADIUS/2);
            }
        }
    }

    update_velocity(dt) {
        // dt: s
        // Note: collisions with other balls are resolved before calling this function
        // resolve collisions with the edges of the table
        if(!this.true_ball) {
            return
        }
        if(((this.x >= DESK_INNER_LENGTH/2-BALL_RADIUS && this.v_x > 0)
            || (this.x <= -DESK_INNER_LENGTH/2+BALL_RADIUS && this.v_x < 0)) &&
            (this.z <= DESK_INNER_WIDTH/2-(POCKET_RADIUS-POCKET_SHIFT*0.5)
            && this.z >= -DESK_INNER_WIDTH/2+(POCKET_RADIUS-POCKET_SHIFT*0.5))) {
            this.v_x *= -1
        }
        if(((this.z >= DESK_INNER_WIDTH/2-BALL_RADIUS && this.v_z > 0)
            || (this.z <= -DESK_INNER_WIDTH/2+BALL_RADIUS && this.v_z < 0)) &&
             ((this.x >= (POCKET_RADIUS) && this.x <= DESK_INNER_LENGTH/2-(POCKET_RADIUS-POCKET_SHIFT*0.5))
            || (this.x <= -(POCKET_RADIUS) && this.x >= -DESK_INNER_LENGTH/2+(POCKET_RADIUS-POCKET_SHIFT*0.5)))) {
            this.v_z *= -1
        }

        // calculate frictional forces
        let acc = FRICTIONAL_COEFFICIENT * 980 * dt     // mu * g * dt
        let acc_x = 0
        let acc_z = 0
        if(this.v_x === 0 || this.v_z === 0) {
            acc_x = acc_z = acc
        }
        else {
            acc_x = acc * Math.abs(this.v_x) / (Math.abs(this.v_x) + Math.abs(this.v_z))
            acc_z = acc * Math.abs(this.v_z) / (Math.abs(this.v_x) + Math.abs(this.v_z))
        }

        let vx_new = 0
        let vz_new = 0
        if(this.v_x < 0) {
            vx_new = this.v_x + acc_x
        }
        else if (this.v_x > 0) {
            vx_new = this.v_x - acc_x
        }
        if(this.v_z < 0) {
            vz_new = this.v_z + acc_z
        }
        else if (this.v_z > 0) {
            vz_new = this.v_z - acc_z
        }
        if(this.v_x * vx_new <= 0) {    // original speed or new speed is zero
            this.v_x = 0
        }
        else {
            this.v_x = vx_new
        }
        if(this.v_z * vz_new <= 0) {
            this.v_z = 0
        }
        else {
            this.v_z = vz_new
        }
    }

    update_position(dt) {
        // dt: s

        // Prevent the ball from intersecting with the edge
        this.x += this.v_x * dt
        if(this.true_ball) {
            if (this.x > DESK_INNER_LENGTH / 2 - BALL_RADIUS &&
                (this.z <= DESK_INNER_WIDTH / 2 - (POCKET_RADIUS - POCKET_SHIFT * 0.5)
                    && this.z >= -DESK_INNER_WIDTH / 2 + (POCKET_RADIUS - POCKET_SHIFT * 0.5))) {
                this.x = DESK_INNER_LENGTH / 2 - BALL_RADIUS
            } else if (this.x <= -DESK_INNER_LENGTH / 2 + BALL_RADIUS &&
                (this.z <= DESK_INNER_WIDTH / 2 - (POCKET_RADIUS - POCKET_SHIFT * 0.5)
                    && this.z >= -DESK_INNER_WIDTH / 2 + (POCKET_RADIUS - POCKET_SHIFT * 0.5))) {
                this.x = -DESK_INNER_LENGTH / 2 + BALL_RADIUS
            }
        }

        this.z += this.v_z * dt
        if(this.true_ball) {
            if(this.z > DESK_INNER_WIDTH/2-BALL_RADIUS &&
                ((this.x >= (POCKET_RADIUS) && this.x <= DESK_INNER_LENGTH/2-(POCKET_RADIUS-POCKET_SHIFT*0.5))
                    || (this.x <= -(POCKET_RADIUS) && this.x >= -DESK_INNER_LENGTH/2+(POCKET_RADIUS-POCKET_SHIFT*0.5)))) {
                this.z = DESK_INNER_WIDTH/2-BALL_RADIUS
            }
            else if(this.z <= -DESK_INNER_WIDTH/2+BALL_RADIUS &&
                ((this.x >= (POCKET_RADIUS) && this.x <= DESK_INNER_LENGTH/2-(POCKET_RADIUS-POCKET_SHIFT*0.5))
                    || (this.x <= -(POCKET_RADIUS) && this.x >= -DESK_INNER_LENGTH/2+(POCKET_RADIUS-POCKET_SHIFT*0.5)))) {
                this.z = -DESK_INNER_WIDTH/2+BALL_RADIUS
            }
        }
    }

    update_rotation(dt) {
        let v = Math.sqrt(this.v_x**2 + this.v_z**2 + this.v_y**2)
        
        let omega = v/BALL_RADIUS
        if(v>5)
            this.nochange_flag = 0

        if (this.collision_flag && v<=5)
        {   this.nochange_flag = 1;
            this.rotation_angle = this.rotation_angle
        }
        else
            this.rotation_angle += omega*dt
        this.collision_flag = 0
    }
}


export class HitSelection {
    constructor() {
        this.v_x = 100      // cm/s
        this.v_y = 0
        this.v_z = 100
        this.updated = false
    }
}


export class GameStatistics {
    constructor(is_eight_ball) {
        this.is_eight_ball = is_eight_ball
        this.player_1_turn = true
        this.score_1 = 0
        this.score_2 = 0
        this.player_1_foul = 0;
        this.player_2_foul = 0;
        this.player_1_color = -1;
        this.player_2_color = -1;
        this.foul = false;
        this.color_set = false;
        this.first_hit = 0;
        this.pocketedThisTurn = false;
        this.win = false;
        this.winner = 0;
        this.player_1_black_eight = false;
        this.player_2_black_eight = false;
    }
}