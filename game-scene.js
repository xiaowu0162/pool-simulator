import {defs, tiny} from './examples/common.js';
import {HitSelection, BALL_RADIUS, DESK_INNER_LENGTH, DESK_INNER_WIDTH, NUM_OBJECT_BALLS, GameModel, init_v_max, init_v_min} from './game-model.js';
import {Shape_From_File} from './examples/obj-file-demo.js';


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;
const {Textured_Phong} = defs;

let BALL_RADIUS_FOR_DRAW = 0.9*BALL_RADIUS     // for scaling transformation only
let LIGHT_X = 0;
let LIGHT_Y = 75;
let LIGHT_Z = 0;

export class GameScene extends Scene {
    ball_shapes;
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // whether show starting scene or not
        this.show_starting_scene = true
        this.show_ending_scene = false
        this.initialize_scene = false
        this.winner_temp = 0

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            plane: new defs.Square(),               // for starting scene
            sphere: new defs.Subdivision_Sphere(4),
            cube: new defs.Cube(),
            pocket: new defs.Capped_Cylinder(50,50,[[0, 50], [0, 50]]),
            table: new Shape_From_File("assets/table.obj"),
            cue: new Shape_From_File("assets/cue.obj"),
            shadow: new defs.Subdivision_Sphere(4),
        };
        this.ball_shapes = Array(16)
        for(let i = 0; i < 16; i++) {
            this.ball_shapes[i] = new Shape_From_File("assets/ball_" + String(i) + ".obj")
        }

        // *** Materials
        this.materials = {
            desk_mat: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#07800d")}),
            floor: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#084ca1")}),
            // floor: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#5d76a0")}),
            // side_wall: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#774cc7")}),
            wall_billboard: new Material(new Texture_Scroll_X(), {
                color: color(0, 0, 0, 1),
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/UCLA_v1.png")
            }),
            ball: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#ffffff")}),
            pocket: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 0.2, color: hex_color("#ffffff")}),
            arrow: new Material(new defs.Phong_Shader(), {ambient: 0.9, diffusivity: 0.5, specularity: 1, color: hex_color("#ffffff")}),
            desk_frame: new Material(new Textured_Phong(), {color: hex_color("#855E42"), ambient: 0.3, diffusivity: 0.9, specularity: 0.5, texture: new Texture("assets/wood.jpg")}),
            pool_table: new Material(new defs.Textured_Phong(1), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/pool_table_v1.jpg")}),
            pool_cue: new Material(new defs.Textured_Phong(1), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/pool_cue_v1.jpg")}),
            pool_balls: new Material(new defs.Textured_Phong(1), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/pool_balls_v1.jpg")}),
            shadow: new Material(new defs.Phong_Shader(), {ambient:0.9, diffusivity: 0.5, specularity:1, color: hex_color("005200")}),
            start_scene: new Material(new defs.Fake_Bump_Map(), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/start_v3.png")}),
            start_scene_char: new Material(new defs.Fake_Bump_Map(), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/start_char_v3.png")}),
            end_scene_win1: new Material(new defs.Fake_Bump_Map(), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/end_player1_v3.png")}),
            end_scene_win2: new Material(new defs.Fake_Bump_Map(), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/end_player2_v3.png")}),
            end_scene_char: new Material(new defs.Fake_Bump_Map(), {color: color(0, 0, 0, 1), ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/end_char_v3.png")}),
        }

        // Camera Locations
        this.camera_location_starting_scene = Mat4.translation(0, 0.5, -12)
        this.initial_camera_location = Mat4.look_at(vec3(0, 300, 100), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_N = Mat4.look_at(vec3(0, 30, -1.46*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_S = Mat4.look_at(vec3(0, 30, 1.46*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_W = Mat4.look_at(vec3(-1.2*DESK_INNER_LENGTH/2, 30, 0), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_E = Mat4.look_at(vec3(1.2*DESK_INNER_LENGTH/2, 30, 0), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_NW = Mat4.look_at(vec3(-1.15*DESK_INNER_LENGTH/2, 30, -1.4*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_NE = Mat4.look_at(vec3(1.15*DESK_INNER_LENGTH/2, 30, -1.4*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_SW = Mat4.look_at(vec3(-1.15*DESK_INNER_LENGTH/2, 30, 1.4*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_SE = Mat4.look_at(vec3(1.15*DESK_INNER_LENGTH/2, 30, 1.4*DESK_INNER_WIDTH/2), vec3(0, 0, 0), vec3(0, 1, 0));
        this.camera_location_cueball = this.initial_camera_location;

        // initialize game
        this.game = new GameModel();
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitors live measurements.

        // Game status display
        this.live_string(box => box.textContent = "Welcome to " + (this.game.stats.is_eight_ball ? "8" : "9")  + " Ball Pool Game!  "
            + "Player " + (this.game.stats.player_1_turn ? "1" : "2")  + "'s turn.");
        this.new_line();
        // this.live_string(box => box.textContent = "Player 1's score: " + String(this.game.stats.score_1)
            // + ". Player 2's score: " + String(this.game.stats.score_2) + ".");
        this.live_string(box => box.textContent = "Player 1's foul : " + String(this.game.stats.player_1_foul));
        this.new_line();
        this.live_string(box => box.textContent = "Player 2's foul : " + String(this.game.stats.player_2_foul));

        // Hit selection
        this.new_line();
        this.key_triggered_button("Reset", ["q"], () => {
            this.show_starting_scene = false
            this.initialize_scene = true
            this.show_ending_scene = false
            this.winner_temp = 0
            this.game = new GameModel()
        });
        this.key_triggered_button("HIT IT", ["h"], () => {
            this.game.handle_foul = false; //turns out the white ball free move.

            for(let i=0; i<NUM_OBJECT_BALLS+1; i++)
                {this.game.balls[i].record_t = true;}
            
            if(this.game.selection_stage) {
                this.game.selection_stage = !this.game.selection_stage
                this.game.balls[16].is_active = true
                this.game.balls[16].v_x = this.game.hit_selection.v_x
                this.game.balls[16].v_z = this.game.hit_selection.v_z
                // this.game.balls[0].v_x = this.game.hit_selection.v_x
                // this.game.balls[0].v_z = this.game.hit_selection.v_z
                this.game.hit_selection_cached = this.game.hit_selection
                this.game.hit_selection = new HitSelection()
            }
        })
        this.key_triggered_button("POOOOWER!", ["u"], () =>{if(Math.sqrt(this.game.hit_selection.v_x **2 + this.game.hit_selection.v_z**2) < init_v_max) {
            this.game.hit_selection.updated = true
            let delta_z = 2
            let ratio = Math.abs(this.game.hit_selection.v_x) / Math.abs(this.game.hit_selection.v_z)
            if(this.game.hit_selection.v_x > 0) {
                
                this.game.hit_selection.v_x += delta_z * ratio
            }
            else if(this.game.hit_selection.v_x < 0) {
                this.game.hit_selection.v_x -= delta_z * ratio
            }
            if(this.game.hit_selection.v_z > 0) {
                this.game.hit_selection.v_z += delta_z
            }
            else if(this.game.hit_selection.v_z < 0 ) {
                this.game.hit_selection.v_z -= delta_z
            }
        }
        })
        this.key_triggered_button("BATTERY LOW!", ["i"], () =>  {if(Math.sqrt(this.game.hit_selection.v_x **2 + this.game.hit_selection.v_z**2) > init_v_min){
            this.game.hit_selection.updated = true
            let delta_z = 2
            let ratio = Math.abs(this.game.hit_selection.v_x) / Math.abs(this.game.hit_selection.v_z)
            if(this.game.hit_selection.v_x > 0) {
                this.game.hit_selection.v_x -= delta_z * ratio
            }
            else if(this.game.hit_selection.v_x < 0) {
                this.game.hit_selection.v_x += delta_z * ratio
            }
            if(this.game.hit_selection.v_z > 0) {
                this.game.hit_selection.v_z -= delta_z
            }
            else if(this.game.hit_selection.v_z < 0) {
                this.game.hit_selection.v_z += delta_z
            }
        }
        })
        this.new_line()
        this.key_triggered_button("Clockwise", ["c"], () => {
            this.game.hit_selection.updated = true
            /*
            let angle = Math.atan(this.game.hit_selection.v_z / this.game.hit_selection.v_x);
            angle -= Math.PI / 50;
            let hypotenue = this.game.hit_selection.v_x**2 + this.game.hit_selection.v_z**2;
            let new_tan = Math.tan(angle)**2 + 1;
            let x = Math.sqrt(hypotenue/new_tan);
            let z = Math.tan(angle) * x;
             */
            let len = Math.sqrt(this.game.hit_selection.v_x ** 2 + this.game.hit_selection.v_z ** 2)
            let theta_old = Math.acos(this.game.hit_selection.v_x / len)
            if(this.game.hit_selection.v_z < 0) {
                theta_old = 2 * Math.PI - theta_old
            }
            let theta_new = theta_old + Math.PI / 100
            let x = len * Math.cos(theta_new)
            let z = len * Math.sin(theta_new)
            this.game.hit_selection.v_x = x;
            this.game.hit_selection.v_z = z;
        })
        this.key_triggered_button("Counter Clockwise", ["x"], () => {
            this.game.hit_selection.updated = true
            // let angle = Math.atan(this.game.hit_selection.v_z / this.game.hit_selection.v_x);
            // angle += Math.PI / 50;
            // let hypotenue = this.game.hit_selection.v_x**2 + this.game.hit_selection.v_z**2;
            // let new_tan = Math.tan(angle)**2 + 1;
            // let x = Math.sqrt(hypotenue/new_tan);
            // let z = Math.tan(angle) * x;
            let len = Math.sqrt(this.game.hit_selection.v_x ** 2 + this.game.hit_selection.v_z ** 2)
            let theta_old = Math.acos(this.game.hit_selection.v_x / len)
            if(this.game.hit_selection.v_z < 0) {
                theta_old = 2 * Math.PI - theta_old
            }
            let theta_new = theta_old - Math.PI / 200
            let x = len * Math.cos(theta_new)
            let z = len * Math.sin(theta_new)
            this.game.hit_selection.v_x = x;
            this.game.hit_selection.v_z = z;
        })


        // Moving cue ball
        this.new_line()
        this.key_triggered_button("Cue ball upwards", ["Control", "i"], () => {
            if(this.game.all_balls_stationary && this.game.handle_foul)
                    this.game.balls[0].z = this.game.balls[0].z - 1;
                
        });
        this.key_triggered_button("Cue ball downwards", ["Control", "k"], () => {
            if(this.game.all_balls_stationary && this.game.handle_foul)
                this.game.balls[0].z = this.game.balls[0].z + 1;
        });
        this.new_line()
        this.key_triggered_button("Cue ball left", ["Control", "j"], () => {
            if(this.game.all_balls_stationary && this.game.handle_foul)
                this.game.balls[0].x = this.game.balls[0].x - 1;
        });
        this.key_triggered_button("Cue ball right", ["Control", "l"], () => {
            if(this.game.all_balls_stationary && this.game.handle_foul)
                this.game.balls[0].x = this.game.balls[0].x + 1;
        });


        // View selection
        this.new_line()
        this.key_triggered_button("NW Corner", ["Control", "1"], () => this.attached = () => this.camera_location_NW);
        this.key_triggered_button("N Side", ["Control", "2"], () => this.attached = () => this.camera_location_N);
        this.key_triggered_button("NE Corner", ["Control", "3"], () => this.attached = () => this.camera_location_NE);
        this.new_line();
        this.key_triggered_button("W Side", ["Control", "4"], () => this.attached = () => this.camera_location_W);
        this.key_triggered_button("Overhead View", ["Control", "5"], () => this.attached = () => this.initial_camera_location);
        this.key_triggered_button("E Side", ["Control", "6"], () => this.attached = () => this.camera_location_E);
        this.new_line();
        this.key_triggered_button("SW Corner", ["Control", "7"], () => this.attached = () => this.camera_location_SW);
        this.key_triggered_button("S Side", ["Control", "8"], () => this.attached = () => this.camera_location_S);
        this.key_triggered_button("SE Corner", ["Control", "9"], () => this.attached = () => this.camera_location_SE);
        this.new_line();
        this.key_triggered_button("Cue Ball View", ["Control", "0"], () => this.attached = () => this.camera_location_cueball);
    }

     make_shadow(x, y, z) {
        let model_transform_shadow = Mat4.identity();
        let ballTop = y + BALL_RADIUS_FOR_DRAW;
        let displacement = Math.sqrt(x**2 + z**2);
        let length = ((ballTop * displacement)/LIGHT_Y) + displacement;
        let ratio = length / displacement;
        let max_x = x * ratio;
        let max_z = z * ratio;
        let center_x = 0.5 * (max_x - x) + x;
        let center_z = 0.5 * (max_z - z) + z;
        let size_factor_x = (length - displacement) * 0.2;
        
        model_transform_shadow = model_transform_shadow.times(Mat4.translation(center_x, -1 * BALL_RADIUS_FOR_DRAW, center_z));
        model_transform_shadow = model_transform_shadow.times(Mat4.scale(BALL_RADIUS_FOR_DRAW, 0.01, BALL_RADIUS_FOR_DRAW));
//         model_transform_shadow = model_transform_shadow.times(Mat4.translation(-1 * center_x, -1 * this.game.balls[0].y, -1 * center_z));
        let radian = Math.acos(center_x/(Math.sqrt(center_x**2 + center_z ** 2)));
        if(center_z < 0) {
            radian = Math.PI * 2 - radian;``
        }
        model_transform_shadow = model_transform_shadow.times(Mat4.rotation(-1 * radian, center_x, 1, center_z));

        return model_transform_shadow;    
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        
        // see if there is a winner
        if(this.game.selection_stage) {
            if(this.game.stats.winner !== 0) {
                this.show_ending_scene = true
                this.winner_temp = this.game.stats.winner
                this.game = new GameModel();
            }
        }


        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            if (this.show_starting_scene || this.show_ending_scene) {
                program_state.set_camera(this.camera_location_starting_scene);
            }
            else {
                program_state.set_camera(this.initial_camera_location);
            }
        }
        else {
            if(this.initialize_scene) {
                program_state.set_camera(this.initial_camera_location)
                this.initialize_scene = false
            }
            else if (this.show_ending_scene) {
                program_state.set_camera(this.camera_location_starting_scene);
            }
            else if(this.attached) {
                let matrix = this.attached()
                program_state.set_camera(matrix)
            }
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // Lighting
        const light_position = vec4(0, 100, 0, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;   // unit: s
        let model_transform = Mat4.identity();

        // Starting scene
        if (this.show_starting_scene) {
            const light_position = vec4(10, 10, 10, 1)
            program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)]
            let model_transform_start_scene = Mat4.identity().times(Mat4.scale(10, 10, 10))
            this.shapes.plane.draw(context, program_state, model_transform_start_scene, this.materials.start_scene)
            let character_shift = 0.2*Math.sin(1.5*t)
            let model_transform_character = Mat4.identity().times(Mat4.scale(2.5, 2.5, 2.5))
                .times(Mat4.translation(1.6,-1.9+character_shift,0.1))
            this.shapes.plane.draw(context, program_state, model_transform_character, this.materials.start_scene_char)
        }

        // Ending scene
        if (this.show_ending_scene) {
            const light_position = vec4(10, 10, 10, 1)
            program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)]
            let model_transform_end_scene = Mat4.identity().times(Mat4.scale(10, 10, 10))
            let character_shift = 0.2*Math.sin(1.5*t)
            let model_transform_character = Mat4.identity().times(Mat4.scale(2.5, 2.5, 2.5))
                .times(Mat4.translation(1.6,-1.9+character_shift,0.1))
            if(this.winner_temp === 1) {
                this.shapes.plane.draw(context, program_state, model_transform_end_scene, this.materials.end_scene_win1)
                this.shapes.plane.draw(context, program_state, model_transform_character, this.materials.end_scene_char)
            }
            else if(this.winner_temp === 2) {
                this.shapes.plane.draw(context, program_state, model_transform_end_scene, this.materials.end_scene_win2)
                this.shapes.plane.draw(context, program_state, model_transform_character, this.materials.end_scene_char)
            }
        }


        // Floor and walls
        let model_transform_floor = model_transform.times(Mat4.translation(0, -100, 0))
            .times(Mat4.scale(675,1,675))
        this.shapes.cube.draw(context, program_state, model_transform_floor, this.materials.floor)

        for(let i=-3; i<4; i++) {
            let model_transform_wall_S = model_transform.times(Mat4.translation(-150*i, -50, 525))
                .times(Mat4.scale(75,75,1))
            this.shapes.cube.draw(context, program_state, model_transform_wall_S, this.materials.wall_billboard)
        }
        // let model_transform_wall_S = model_transform.times(Mat4.translation(0, -50, 600))
        //     .times(Mat4.scale(600,75,0))
        // this.shapes.cube.draw(context, program_state, model_transform_wall_S, this.materials.wall_billboard)
        //

        for(let i=-3; i<4; i++) {
            let model_transform_wall_N = model_transform.times(Mat4.translation(-150*i, -50, -525))
                .times(Mat4.scale(75,75,1))
            this.shapes.cube.draw(context, program_state, model_transform_wall_N, this.materials.wall_billboard)
        }

        for(let i=-3; i<4; i++) {
            let model_transform_wall_W = model_transform.times(Mat4.translation(-525, -50, -150*i))
                .times(Mat4.scale(1, 75, 75))
            this.shapes.cube.draw(context, program_state, model_transform_wall_W, this.materials.wall_billboard)
        }

        for(let i=-3; i<4; i++) {
            let model_transform_wall_E = model_transform.times(Mat4.translation(525, -50, -150*i))
                .times(Mat4.scale(1, 75, 75))
            this.shapes.cube.draw(context, program_state, model_transform_wall_E, this.materials.wall_billboard)
        }


        // Pool table, loaded from obj files
        let model_transform_table = model_transform.times(Mat4.translation(17, -33, 0))
            .times(Mat4.scale(155, 130,170))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
        this.shapes.table.draw(context, program_state, model_transform_table, this.materials.pool_table)


        // Pool cue, loaded from obj files
        if(this.game.selection_stage) {
            let len = Math.sqrt(this.game.hit_selection.v_x ** 2 + this.game.hit_selection.v_z ** 2)
            let cue_angle = Math.acos(this.game.hit_selection.v_x / len)
            if(this.game.hit_selection.v_z < 0) {
                cue_angle = 2 * Math.PI - cue_angle
            }
            // let cue_shift_x = 2 * (len+40) * Math.cos(cue_angle)
            let cue_shift_x = 230 * Math.cos(cue_angle)
            // let cue_shift_z = 2 * (len+40)  * Math.sin(cue_angle)
            let cue_shift_z = 230 * Math.sin(cue_angle)
            let model_transform_cue = model_transform.times(Mat4.translation(this.game.balls[0].x, 0, this.game.balls[0].z))
                .times(Mat4.translation(-cue_shift_x, 0, -cue_shift_z))
                .times(Mat4.rotation(Math.PI / 2-cue_angle,0,1,0))
                .times(Mat4.rotation(Math.PI / 2,1,0,0))
                .times(Mat4.scale(90, 90, 90))
            this.shapes.cue.draw(context, program_state, model_transform_cue, this.materials.pool_cue)

            // update cue tip placeholder ball
            this.game.balls[16].x = this.game.balls[0].x - 67 * Math.cos(cue_angle)
            this.game.balls[16].z = this.game.balls[0].z - 67 * Math.sin(cue_angle)
        }

        // cue in hitting stage
        if(this.game.balls[16].is_active) {
            let len = Math.sqrt(this.game.hit_selection_cached.v_x ** 2 + this.game.hit_selection_cached.v_z ** 2)
            let cue_angle = Math.acos(this.game.hit_selection_cached.v_x / len)
            if(this.game.hit_selection_cached.v_z < 0) {
                cue_angle = 2 * Math.PI - cue_angle
            }
            let cue_shift_x = this.game.balls[16].x - 163 * Math.cos(cue_angle)
            let cue_shift_z = this.game.balls[16].z - 163 * Math.sin(cue_angle)
            let model_transform_cue = model_transform.times(Mat4.translation(cue_shift_x, 0, cue_shift_z))
                .times(Mat4.rotation(Math.PI / 2-cue_angle,0,1,0))
                .times(Mat4.rotation(Math.PI / 2,1,0,0))
                .times(Mat4.scale(90, 90, 90))
            this.shapes.cue.draw(context, program_state, model_transform_cue, this.materials.pool_cue)
        }


        // New pool balls, loaded from obj files
        for(let i = 0; i < 16; i++) {
            let model_transform_ball_new = model_transform.times(Mat4.translation(-30*BALL_RADIUS+4*i*BALL_RADIUS, 2, -135))
                .times(Mat4.scale(BALL_RADIUS_FOR_DRAW,BALL_RADIUS_FOR_DRAW,BALL_RADIUS_FOR_DRAW))
            if(this.game.balls[i].is_active)
            {this.ball_shapes[i].draw(context, program_state, model_transform_ball_new, this.materials.pool_balls)}
        }


        // Perform necessary updates to the game
        this.game.forward(dt)

        this.camera_location_cueball = Mat4.look_at(vec3(0, 150, 30), vec3(this.game.balls[0].x, 0, this.game.balls[0].z), vec3(0, 1, 0))

        // Draw the balls
        for(let i=0; i<NUM_OBJECT_BALLS+1; i++) {
            // add if(this.game.balls[i].is_active) later
            let model_transform_ball = model_transform;
            model_transform_ball = model_transform_ball.times(Mat4.translation(this.game.balls[i].x, this.game.balls[i].y, this.game.balls[i].z))
            let x_rotation_dir = this.game.balls[i].v_z === 0 ? (this.game.balls[i].v_z_prev>0?-1:1) : (this.game.balls[i].v_z>0?-1:1)
            if(!this.game.balls[i].nochange_flag)
                this.game.balls[i].x_dir = x_rotation_dir
            let z_rotation_dir = this.game.balls[i].v_x === 0 ? (this.game.balls[i].v_x_prev>0?1:-1)*this.game.balls[i].v_x_over_z : (this.game.balls[i].v_x>0?1:-1)*this.game.balls[i].v_x_over_z
            if(!this.game.balls[i].nochange_flag)
                this.game.balls[i].z_dir = z_rotation_dir
            // this.game.balls[i].nochange_flag = 0
            //model_transform_ball = model_transform_ball.times(Mat4.rotation(-this.game.balls[i].rotation_angle, x_rotation_dir, 0, z_rotation_dir))
            model_transform_ball = model_transform_ball.times(Mat4.rotation(-this.game.balls[i].rotation_angle, this.game.balls[i].x_dir, 0, this.game.balls[i].z_dir))
            if(i === 0) {
                let model_transform_cue_ball = model_transform_ball.times(Mat4.scale(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS))
                this.shapes.sphere.draw(context, program_state, model_transform_cue_ball, this.materials.ball.override({color: this.game.balls[i].ball_color}))
            }
            else {
                model_transform_ball = model_transform_ball.times(Mat4.scale(BALL_RADIUS_FOR_DRAW, BALL_RADIUS_FOR_DRAW, BALL_RADIUS_FOR_DRAW))
                this.ball_shapes[i].draw(context, program_state, model_transform_ball, this.materials.pool_balls)
            }
        }

        // Draw the hit selection arrow
        let model_transform_arrow = Mat4.identity();
        model_transform_arrow = model_transform_arrow.times(Mat4.translation(this.game.balls[0].x, this.game.balls[0].y, this.game.balls[0].z));
        model_transform_arrow = model_transform_arrow.times(Mat4.scale(0.3, 0.3, 0.3));

        if(this.game.selection_stage) {
            for(let i = 0; i < 40; i ++) {
                model_transform_arrow = model_transform_arrow.times(Mat4.translation(this.game.hit_selection.v_x / 50, 0, this.game.hit_selection.v_z / 50));
                this.shapes.cube.draw(context, program_state, model_transform_arrow, this.materials.arrow);
            }
        }

        // Draw shadow
        for(let i = 0; i <= NUM_OBJECT_BALLS; i ++) {
            if(this.game.balls[i].is_active) {
                let model_transform_shadow = this.make_shadow(this.game.balls[i].x, this.game.balls[i].y, this.game.balls[i].z);
                this.shapes.shadow.draw(context, program_state, model_transform_shadow, this.materials.shadow);  
            }           
        }
    }
}



// from assignment 4
class Texture_Scroll_X extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                float t = animation_time;
                vec2 shift = vec2(-0.7*t,0);
                vec4 tex_color = texture2D( texture, f_tex_coord+shift);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}