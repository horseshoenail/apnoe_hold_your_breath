// developer:            horseshoenail
// Version:              1.1
// date of last version: 29.3.2020

/* 
This FITBIT app helps you to increase your maximum breath holding time for e.g. free diving.

--- IMPORTANT NOTES ---

  !!! Important note 1: Health warning !!!
  You use the app and the tables on your own risk! 
  Please be careful when using the tables as holding your breath 
  too long might restrict your reactions and can lead to fainting. Only
  use the tables/app when someone else is around and you are in a save 
  environment. Listen to your body and stop when you feel weird.

  !!! Important note 2: Device health warning !!!
  As the countdown does not work when the screen is off, the display is turned
  to “always on” mode while the tables are running. The device switches to 
  dim mode during this time. As the whole table might take 20 to 
  30 min this behavior is consuming battery and might influence your device. 

  - The app requires access to your heart rate sensor 

--- GETTING STARTED ---

  -Start the app with or without a FITBIT device:
    A very good overview is given here: https://dev.fitbit.com/getting-started/

    In summary you need to do the following steps:
    - go to https://studio.fitbit.com and create an account
    - create a new empty project
    - download this project from git as zip
    - extract the zip locally 
    - mark all folders (app, companion, resources, settings) and drag and drop them into
      the left menu of the fitbit.studio development surface. All folders should now get 
      copied to your fitbit.studio development environment
    - for testing the app you now also need to install the “Fitbit OS simulator”.
      You can find it here: 
       - windows: https://simulator-updates.fitbit.com/download/latest/win
       - macOS: https://simulator-updates.fitbit.com/download/latest/mac
    - start the Fitbit OS simulator 
    - In fitbit.studio use the “select Phone” and “select device” menu to select the simulator
    - with the >Run button you can build and start the app, its now shown in the Simulator
    - if you want to run it on your own device:
      - on your phone open the fitbit app
        - select your Fitbit device you want to run it on
        - open the developer bridge menu and start the bridge
      - on your fitbit device:
        - go to settings 
        - start developer bridge
      - in fitbit.studio select your phone and your fitbit device in the select list
      - in fitbit.studio press >Run
      - the app is now getting installed on your device and starts. You can find it
        later in your normal app menu. 

--- FUNCTIONALITIES AND GENERAL DESCRIPTION ---

  The following functionalities are included.
  - Start screen
    - set:
      three tumbler elements allow you to set your maximum breath holding 
      time that you achieved recently. The value is saved on the device
      and is available whenever the app is started again

    - hold breath:
      this is more or less a simple stop watch. You can use it to see how long
      you are able to hold your breath. Furthermore it shows your heartbeat.
      As soon as you stop the watch with the top
      right physical button an additional screen pops up with two buttons:
        - set as basis for table:
          if you think this time represents your maximum breath holding time you
          can tap the "set as basis for table" button and the value is stored
          on the device. If you tab the "set" screen in the main menu this value is
          used to set the tumbler. With the back button you can get back to the main
          menu
        - save in history:
          if you tap this button the value is stored on the device and the screen shows 
          a table with your last five values and the corresponding date.
          Not more than 5 values are stored on the device. A connection to the 
          companion is not included yet. With the back button you can get back to the main
          menu

    - start CO2 table
      When you tap the "start CO2 table" button a new screen opens with mainly three elements.
      The top line indicates the time you shall breathe to slow down your pulse and to
      increase your blood O2 level. The blue bar in the back is a visual indicator for the countdown. 
      When 10s or 5s  or 1s remain the device is vibrating.
      When the breathe countdown is down to 0 the hold countdown starts.
      In total eight cycles of breathing and holding will be run. Each cycle is indicated by the 
      blinking circle on the lower half of the screen. 
      The total remaining time for all circles is displayed in the lower left.
      The heartbeat is displayed in the lower right.
      For each cycle the mean heartbeat is calculated and displayed at the end of the countdown

      The CO2 table is calculated in the following way:
      apnea is constant with 50% of your max breath holding time
      ventilate is starting with 2:30 min and is reduced every
      cycle by 15 sec to a minimum of 60s

    - start O2 table
      display and functions comparable to the CO2 table countdown

      The O2 table is calculated in the following way:
      ventilate is constant with 2 minutes
      apnea ends with 80% of your maximum breath holding time and
      for each previous cycle the time span is 15 sec lower with a 
      minimum of 30 seconds

*/


// import of packages and libraries needed
import document from "document";
import { me } from "appbit";
import * as util from "../resources/utils";
import clock from "clock";
import { HeartRateSensor } from "heart-rate";
import * as fs from "fs";
import { vibration } from "haptics";
import { display } from "display";
import { me as device } from "device";
import { me as appbit } from "appbit";

//console.log('device is Versa:',device.modelName == "Versa")
//console.log('device is Ionic:',device.modelName == "Ionic")
if (device.modelName == "Ionic"){
  var screen_dimx = 348
  var screen_dimy = 250
}else{
  var screen_dimx = 300
  var screen_dimy = 300
}


// prevent from stoppinng the app by automatic timeout
me.appTimeoutEnabled = false;

// some general settings to set app behaviour
var color_breathe = "forestgreen"
var color_hold    = "blue"//"navy"
var max_cycles    = 8 // needs to smaller equal 8 as otherwise the dispaly is not working


// start heart rate monitoring
 if (HeartRateSensor && appbit.permissions.granted("access_heart_rate")) {
  var heart_rate = new HeartRateSensor();
  heart_rate.start();
}else{
  class heart_rate_empty {
    constructor() {
      this.heartRate = 0;
    }
  }  
  const heart_rate = new heart_rate_empty()
}
var hr_label = document.getElementById("hr_label");
var hr_icon = document.getElementById("hr_icon");


// define the different screens used in the app
var actually_showing   = ""
var startScreen        = document.getElementById("startScreen");
var holdScreen         = document.getElementById("holdScreen");
var setTimeScreen      = document.getElementById("setTimeScreen");
var TableScreen        = document.getElementById("TableScreen");

// a general text label used in different screens
var general_text_label = document.getElementById("general_text_label");


// clock and counter variables
var now     = 0
var s_hours = 0.
var s_mins  = 0.
var s_secs  = 0.
var counting = false // if counting is true the timer and countdowns are running
var seconds_stopped = 0 // helper needed when counting is false
var tdiff = 0 // the main variable showing the elapsed time in seconds between starting and stopping

// startScreen elements
var settings     = document.getElementById("settings"); // button for setting time
var hold_breath  = document.getElementById("hold_breath"); // button for stop watch
var start_CO2    = document.getElementById("start_CO2"); // start CO2 table countdown
var start_O2     = document.getElementById("start_O2"); // start O2 table countdown

// setTimeScreen elements
var tumbler_minutes    = document.getElementById("tumbler_minutes");
var tumbler_seconds_1  = document.getElementById("tumbler_seconds_1");
var tumbler_seconds_2  = document.getElementById("tumbler_seconds_2");
var doubledot_label    = document.getElementById("doubledot_label");
var set_time_label     = document.getElementById("set_time_label");
var set_time_in_s      = 0;

// holdScreen elements
var holdScreen_timer = document.getElementById("holdScreen_timer");
var play_pause_image = document.getElementById("play_pause_image");
var set_as_max_button = document.getElementById("set_as_max_button");
var save_in_history_button = document.getElementById("save_in_history_button");
var play_pause_button = document.getElementById("play_pause_button");

// historyScreen elements (is whown when the hold breath stop watch was stopped)
let saved_dates_label = new Array();
let saved_times_label = new Array();
saved_dates_label[0] = document.getElementById("date0");
saved_times_label[0] = document.getElementById("value0");
saved_dates_label[1] = document.getElementById("date1");
saved_times_label[1] = document.getElementById("value1");
saved_dates_label[2] = document.getElementById("date2");
saved_times_label[2] = document.getElementById("value2");
saved_dates_label[3] = document.getElementById("date3");
saved_times_label[3] = document.getElementById("value3");
saved_dates_label[4] = document.getElementById("date4");
saved_times_label[4] = document.getElementById("value4");
let hist_elements = {
  date_labels : saved_dates_label,
  time_labels : saved_times_label,    
}

// Table Screen elements
var total_time_label = document.getElementById("total_time_label");
var rect_breathe     = document.getElementById("rect_breathe");
var rect_hold        = document.getElementById("rect_hold");
var breathe_label    = document.getElementById("breathe_label");
var breathe_time     = document.getElementById("breathe_time");
var hold_label       = document.getElementById("hold_label");
var hold_time        = document.getElementById("hold_time");
var results_drawn    = false
// elements needed to show the course of the mean heartbeat per cycle at the end
var circle_array  = new Array();
circle_array[0] = document.getElementById("circle0");
circle_array[1] = document.getElementById("circle1");
circle_array[2] = document.getElementById("circle2");
circle_array[3] = document.getElementById("circle3");
circle_array[4] = document.getElementById("circle4");
circle_array[5] = document.getElementById("circle5");
circle_array[6] = document.getElementById("circle6");
circle_array[7] = document.getElementById("circle7");
var circle_array2  = new Array();
circle_array2[0] = document.getElementById("circle20");
circle_array2[1] = document.getElementById("circle21");
circle_array2[2] = document.getElementById("circle22");
circle_array2[3] = document.getElementById("circle23");
circle_array2[4] = document.getElementById("circle24");
circle_array2[5] = document.getElementById("circle25");
circle_array2[6] = document.getElementById("circle26");
circle_array2[7] = document.getElementById("circle27");
var hr_text_array  = new Array();
hr_text_array[0] = document.getElementById("hr_text0");
hr_text_array[1] = document.getElementById("hr_text1");
hr_text_array[2] = document.getElementById("hr_text2");
hr_text_array[3] = document.getElementById("hr_text3");
hr_text_array[4] = document.getElementById("hr_text4");
hr_text_array[5] = document.getElementById("hr_text5");
hr_text_array[6] = document.getElementById("hr_text6");
hr_text_array[7] = document.getElementById("hr_text7");
var hr_text_array2  = new Array();
hr_text_array2[0] = document.getElementById("hr_text20");
hr_text_array2[1] = document.getElementById("hr_text21");
hr_text_array2[2] = document.getElementById("hr_text22");
hr_text_array2[3] = document.getElementById("hr_text23");
hr_text_array2[4] = document.getElementById("hr_text24");
hr_text_array2[5] = document.getElementById("hr_text25");
hr_text_array2[6] = document.getElementById("hr_text26");
hr_text_array2[7] = document.getElementById("hr_text27");
var line_array  = new Array();
line_array[0] = document.getElementById("line0");
line_array[1] = document.getElementById("line1");
line_array[2] = document.getElementById("line2");
line_array[3] = document.getElementById("line3");
line_array[4] = document.getElementById("line4");
line_array[5] = document.getElementById("line5");
line_array[6] = document.getElementById("line6");
var line_array2  = new Array();
line_array2[0] = document.getElementById("line20");
line_array2[1] = document.getElementById("line21");
line_array2[2] = document.getElementById("line22");
line_array2[3] = document.getElementById("line23");
line_array2[4] = document.getElementById("line24");
line_array2[5] = document.getElementById("line25");
line_array2[6] = document.getElementById("line26");

var continue_countdown = document.getElementById("continue_countdown");
var stop_countdown = document.getElementById("stop_countdown");
let total_time = 0
let nsteps     = 16
let steps      = 0
let countdown  = 0
var tdiff_at_start = 0
let ventilate  = new Array();
let apnea      = new Array();
let hr_sum_hold      = new Array();
let hr_count_hold    = new Array();
let hr_sum_breathe   = new Array();
let hr_count_breathe = new Array();
for (var i = 0; i < max_cycles; i++){
   ventilate[i] = 0 
   apnea[i]     = 0
   hr_sum_hold[i] = 0
   hr_count_hold[i]  = 0
   hr_sum_breathe[i] = 0
   hr_count_breathe[i]  = 0
}
let mytable={
  ventilate:ventilate,
  apnea:apnea,
  hr_sum_hold:hr_sum_hold,
  hr_count_hold:hr_count_hold,
  hr_sum_breathe:hr_sum_breathe,
  hr_count_breathe:hr_count_breathe
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// SHOW HIDE DIFFERENT SCREENS
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// function needed when switching between screens
function hide_all(){
  hide_holdScreen()
  hide_startScreen()
  hide_setTimeScreen()
  hide_TableScreen()
  hr_label.style.display = "none"
  general_text_label.style.display = "none"
  for (var i = 0; i < 5; i++){
     hist_elements.date_labels[i].style.display = "none"
     hist_elements.time_labels[i].style.display = "none"
  }
}

function show_startScreen() {
  hide_all()
  actually_showing = "startScreen"
  startScreen.style.display = "inline";
  
  hold_breath.style.display = "inline";
  start_CO2.style.display   = "inline";
  start_O2.style.display    = "inline";
}
function hide_startScreen() {
  startScreen.style.display = "none";

  hold_breath.style.display = "none";
  start_CO2.style.display   = "none";
  start_O2.style.display    = "none";
}

function show_holdScreen() {
  hide_all()
  holdScreen.style.display = "inline";
  actually_showing = "holdScreen"

  hr_icon.style.display  = "inline"
  hr_icon.href = "./resources/icons/stat_hr_open_32px.png"
  hr_icon.x = 40
  hr_icon.y = 30
  hr_label.style.display  = "inline"
  hr_label.style.fontSize = 40
  hr_label.x = 90
  hr_label.y = 60
  
  holdScreen_timer.style.display = "inline";
  play_pause_image.style.display = "inline";
  play_pause_button.style.display = "inline";
  holdScreen_timer.text = "00:00"
  if (device.modelName == "Ionic"){
    holdScreen_timer.style.fontSize = 120
  }else{
    holdScreen_timer.style.fontSize = 100
  }  
  holdScreen_timer.y = 180
  holdScreen_timer.x = 30

  set_play_pause_icon() 
}
function hide_holdScreen() {
  holdScreen.style.display       = "none";
  holdScreen_timer.style.display = "none";
  
  hr_icon.style.display                = "none"
  play_pause_image.style.display       = "none";
  play_pause_button.style.display      = "none";
  set_as_max_button.style.display      = "none";
  save_in_history_button.style.display = "none";
}

function show_setTimeScreen() {
  hide_all()
  setTimeScreen.style.display = "inline";
  actually_showing = "setTimeScreen"
  // load the maximum time from the local storage and set the tumbler 
  // values accordingly
  let  DATA_FILE = "actual.cbor"
  let dict_in = read_data(DATA_FILE)
  if (Object.keys(dict_in).length > 0) {
    let stored_value = dict_in.actual_time
    tumbler_minutes.value = Math.floor( stored_value/60)
    tumbler_seconds_1.value = Math.floor((stored_value - tumbler_minutes.value*60)/10)
    tumbler_seconds_2.value = Math.floor((stored_value - tumbler_minutes.value*60 - tumbler_seconds_1.value*10))
  }else{
    let stored_value = 0
  }
  set_time_label.style.display    = "inline";
  set_time_label.text = "Enter your current \nmax. breath holding time:"
  set_time_label.style.fontSize = 27
  set_time_label.x = 5
  set_time_label.y = 10
  set_time_label.style.fill  = "white"
  
  tumbler_minutes.style.display   = "inline";
  tumbler_seconds_1.style.display = "inline";
  tumbler_seconds_2.style.display = "inline";
  doubledot_label.style.display   = "inline";
  if (device.modelName != "Ionic"){
    doubledot_label.x = 140
    doubledot_label.y = 140 
  }
}
function hide_setTimeScreen() {
  setTimeScreen.style.display     = "none";
  set_time_label.style.display    = "none";
  tumbler_minutes.style.display   = "none";
  tumbler_seconds_1.style.display = "none";
  tumbler_seconds_2.style.display = "none";
  doubledot_label.style.display   = "none";
}

function show_TableScreen(){
  TableScreen.style.display = "inline";
  actually_showing = "TableScreen"
  total_time_label.style.display = "inline";
  total_time_label.style.fill  = "white"
  total_time_label.text = ""
  total_time_label.style.fontSize = 40
  total_time_label.x = 5
  total_time_label.y = 240
  
  hr_label.style.display  = "inline"
  hr_label.style.fontSize = 40
  hr_label.x = 0.8*screen_dimx
  hr_label.y = 240
  hr_label.style.fill = "red"

  rect_breathe.style.display = "inline";
  rect_breathe.x = 0
  rect_breathe.y = 30
  rect_breathe.height = 60
  rect_breathe.width  = screen_dimx
  rect_breathe.style.fill = color_breathe
  
  rect_hold.style.display = "inline";
  rect_hold.x = 0
  rect_hold.y = 105
  rect_hold.height = 60
  rect_hold.width  = screen_dimx
  rect_hold.style.fill = color_hold
  
  breathe_label.style.display = "inline";
  breathe_label.text = "breathe";
  breathe_label.style.fill  = "white"
  breathe_label.style.fontSize = 45
  breathe_label.x = 5
  breathe_label.y = 77
  breathe_time.style.display  = "inline";
  breathe_time.text = "";
  breathe_time.style.fill  = "white"
  breathe_time.style.fontSize = 60
  breathe_time.x = 0.52*screen_dimx //190
  breathe_time.y = 80

  hold_label.style.display  = "inline";
  hold_label.text  = "hold";
  hold_label.style.fontSize = 45
  hold_label.style.fill  = "white"
  hold_label.x = 5
  hold_label.y = 150
  hold_time.style.display   = "inline";
  hold_time.style.fill  = "white"
  hold_time.text  = "";
  hold_time.style.fontSize = 60
  hold_time.x = 0.52*screen_dimx //190
  hold_time.y = 156

  for (var i = 0; i < max_cycles; i++){
    circle_array[i].style.display = "inline"
    if (device.modelName == "Ionic"){
      circle_array[i].cx = 20+i*44
    }else{
      circle_array[i].cx = 20+i*36
    }
    circle_array[i].cy = 190
    circle_array[i].r = 15
    circle_array[i].style.fill = "white"
  }
}


function hide_TableScreen(){
  display.autoOff = true
  display.brightnessOverride   = "normal"

  total_time_label.style.display = "none";
  rect_breathe.style.display   = "none";
  rect_hold.style.display      = "none";
  breathe_label.style.display  = "none";
  breathe_time.style.display   = "none";
  hold_label.style.display     = "none";
  hold_time.style.display      = "none";
  hr_label.style.display       = "none";
  stop_countdown.style.display = "none"
  continue_countdown.style.display = "none"
  for (var i = 0; i < max_cycles; i++){
    circle_array[i].style.display   = "none";
    hr_text_array[i].style.display  = "none";
    circle_array2[i].style.display  = "none";
    hr_text_array2[i].style.display = "none";
    if (i < 7){
      line_array[i].style.display     = "none";
      line_array2[i].style.display    = "none";
    }
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CLOCK ELEMENT
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function startWatch(){
  // Update the counter with every tick 
  clock.granularity = "seconds";
  clock.ontick = (evt) => { 
    now   = evt.date;   
    // if counting was stopped by the user store the time the timer was stopped
    if (counting == false){
      seconds_stopped = seconds_stopped + 1
    }  
    
    // CALCULATE AND DISPLAY ELAPSED TIME (for hold breath only, timers are 
    // handled differently in the update_timer function)
    if (counting == true){
      tdiff = (now.getHours()*60*60+
                   now.getMinutes()*60+
                   now.getSeconds()) - 
                  (s_hours*60*60+s_mins*60+s_secs)
      tdiff = tdiff - seconds_stopped
      let time_elapsed = get_time_from_tdiff(tdiff)
      holdScreen_timer.text = `${time_elapsed}`;
    }
    // every second update the heartbeat for timer and hold breath function
    hr_label.text = heart_rate.heartRate;
  }
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// PHYSICAL BUTTON ACTIONS
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// functions needed for pyhsical button interactions
document.onkeypress = function(e) {
  // turn off that the back button automatically escapes the app
  e.preventDefault();
  
  // upper right button interactions
  if (e.key == "up"){
    if (actually_showing  == "holdScreen"){
       start_pause_holdingBreath()
    }
  }

  // lower right button interactions
  if (e.key == "down"){
  }

  // left side back button interactions
  if (e.key == "back"){
    if (actually_showing  == "startScreen"){
      me.exit();
    }else{
      if (actually_showing  == "holdScreen"){
        if (counting == false) {
          hide_holdScreen()
          show_startScreen()
        }
      }
      else if (actually_showing  == "setTimeScreen"){
          set_time_in_s = tumbler_minutes.value*60.+
                          tumbler_seconds_1.value*10.+
                          tumbler_seconds_2.value*1.
          write_actual("actual.cbor", set_time_in_s)
          hide_all()
          show_startScreen()
      }
      else if ((actually_showing  == "setMaxScreen")||
               (actually_showing  == "saveHistory")){
          hide_all()
          show_holdScreen()
          counting = true
          start_pause_holdingBreath()
      }       
      else if(actually_showing == "TableScreen"){
        if (counting == true){
          counting = false
          hide_TableScreen()
          display.autoOff = true
          display.brightnessOverride = "normal"
          continue_countdown.style.display = "inline"
          stop_countdown.style.display     = "inline"
        }else{
          reset_timer()
          continue_countdown.style.display = "none"
          stop_countdown.style.display     = "none"
          hide_TableScreen()
          show_startScreen()
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// HOLD BREATH SECTION
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

hold_breath.onactivate = function(evt) {
   hide_startScreen()
   reset_timer()
   counting = false
   show_holdScreen()
}

function reset_timer (){
  s_hours = now.getHours();
  s_mins  = now.getMinutes();
  s_secs  = now.getSeconds();
  seconds_stopped = 0
  counting   = true
  tdiff_at_start = 0
  tdiff  = 0
  steps  = 0
  nsteps = 16
  breathe_time.text  = "";
  rect_breathe.width = 360
  rect_hold.width    = 360
  hold_time.text     = "";
  results_drawn    = false
}

function start_pause_holdingBreath() {
  // if the lower right button was pressed stop counting the 
  // breath holding timer and show the button that enables one
  // to store the measured time as new max time

  if (counting == true){
    counting = false
  }else{
    counting = true
  }
  set_play_pause_icon()  

  if (counting == false){
    holdScreen_timer.style.fontSize = 70
    let time_elapsed = get_time_from_tdiff(tdiff)
    holdScreen_timer.text = `${time_elapsed}`;
    holdScreen_timer.y = 70
    holdScreen_timer.x = 10
    hr_icon.style.display                = "none"
    hr_label.style.display               = "none"
    play_pause_button.style.display      = "none"
    set_as_max_button.style.display      = "inline";
    save_in_history_button.style.display = "inline";
  } else {
    
    holdScreen_timer.y = 180
    holdScreen_timer.x = 30
    if (device.modelName == "Ionic"){
      holdScreen_timer.style.fontSize = 120
    }else{
      holdScreen_timer.style.fontSize = 100
    }
    hr_icon.style.display                = "inline"
    hr_label.style.display               = "inline"
    set_as_max_button.style.display      = "none";
    save_in_history_button.style.display = "none";
    play_pause_button.style.display      = "inline"
  } 
}

function set_play_pause_icon() {
  // on the holding screen change between play and pause if the lower right 
  // button was clicked
  if (counting){
    play_pause_image.href = "./resources/icons/btn_combo_pause_press_p.png"
  }else{
    play_pause_image.href = "./resources/icons/btn_combo_play_press_p.png"
  }
}

play_pause_button.onactivate = function(evt) {
  if (actually_showing  == "holdScreen"){
     start_pause_holdingBreath()
  }
}

set_as_max_button.onactivate = function(evt) {
   // save the time from the holdingScreen timer as max time locally
  actually_showing = "setMaxScreen"
  let  DATA_FILE = "actual.cbor"
  write_actual(DATA_FILE, tdiff)
  let dict_in = read_data(DATA_FILE)
  hr_icon.style.display                = "none"
  play_pause_image.style.display       = "none";
  play_pause_button.style.display       = "none";
  set_as_max_button.style.display      = "none";
  save_in_history_button.style.display = "none";

  general_text_label.style.display     = "inline"
  general_text_label.text = "saved:"
  general_text_label.style.fontSize = 70
  general_text_label.y = 70
  general_text_label.x = 10  

  holdScreen_timer.style.fontSize = 70
  holdScreen_timer.y = 150
  holdScreen_timer.x = 10  

}

save_in_history_button.onactivate = function(evt) {
   // save the time from the holdingScreen timer in the local history table
  actually_showing = "saveHistory"
  let  DATA_FILE = "history.cbor"
  write_history(DATA_FILE, tdiff)
  hr_icon.style.display                = "none"
  play_pause_image.style.display       = "none";
  play_pause_button.style.display      = "none";
  set_as_max_button.style.display      = "none";
  save_in_history_button.style.display = "none";
  holdScreen_timer.style.display       = "none";

  general_text_label.style.display     = "inline"
  general_text_label.text = "your history:"
  if (device.modelName=="Versa"){
    general_text_label.style.fontSize = 35
  }else{
    general_text_label.style.fontSize = 40
  }
  general_text_label.y = 40
  general_text_label.x = 10  
  
  let dict_in = read_data(DATA_FILE)
  for (var i = 0; i < 5; i++){
    let x = 10
    let y = (i+2)*40
    showvalues (dict_in.dates[i],dict_in.values[i],
                x,y,
                hist_elements.date_labels[i],hist_elements.time_labels[i])
  }
}

function showvalues(date,value,x,y,date_label,time_label){
  // after the hold breath action was stopped and the 
  // user clicked save in history the last historic values are
  // displayed on the watch
  if (date  == null){ date = 0}
  if (value == null){ value = 0}
  
  date_label.style.display = "inline"
  date_label.text = "- "+date
  date_label.style.fontSize = 20
  date_label.x = x  
  date_label.y = y
  date_label.style.fill = "white"

  time_label.style.display = "inline"
  time_label.text = "- "+value+" sec."
  time_label.style.fontSize = 20
  time_label.x = x + 0.67*screen_dimx 
  time_label.y = y
  time_label.style.fill = "white"
}


// convert total seconds into a string of mm:ss
function get_time_from_tdiff(time_in_sec){
  let hours = Math.floor( time_in_sec/(60*60));
  let mins  = Math.floor((time_in_sec- hours*60*60)/60);
  let secs  = time_in_sec- hours*60*60 - mins*60;
  //let time_elapsed = `${util.zeroPad(hours)}:${util.zeroPad(mins)}:${util.zeroPad(secs)}`
  let time_elapsed = `${util.zeroPad(mins)}:${util.zeroPad(secs)}`
  return time_elapsed
}

// ---------------------------------------------------------------------------
// SAVE DATA LOCALLY ON THE DEVICE IN A BINARY FILE
// ---------------------------------------------------------------------------

// the maximum time shall be stored on the device to the tables can use 
// whenever the user starts again
function read_data(DATA_FILE) {
  let DATA_TYPE = "cbor";
  // try to load data. If no data are available save actual data
  try {
    let data =  fs.readFileSync(DATA_FILE, DATA_TYPE);
    //console.log("got data: " + data.steps_hist[hours])
  } catch (ex) {
    console.log("no data available: " + DATA_FILE)
    let data = {}
  } 
  return data
}

// write the value from hold breath to the device so it can be used 
// later again when calculating the tables
function write_actual(DATA_FILE, actual_time = 0) {
  let DATA_TYPE = "cbor";
  let data = {actual_time: actual_time}  
  fs.writeFileSync(DATA_FILE, data, DATA_TYPE);
}

// save the history (last five values) on the device
function write_history(DATA_FILE, actual_time = 0) {
  let DATA_TYPE = "cbor";
  let dates_hist  = new Array();
  let values_hist = new Array(); 
  var tn = new Date().toLocaleTimeString('en-US', { hour12: true, 
                                             hour: "numeric", 
                                             minute: "numeric"});
  var dn = new Date().toLocaleDateString();
  var dtn = dn+"-"+tn.split('.')[0];
      
  try {
    let data =  fs.readFileSync(DATA_FILE, DATA_TYPE);
    dates_hist  = data.dates
    values_hist = data.values
    console.log("got data: " + values_hist)
    
  } catch (ex) {
    console.log("no data available: " + DATA_FILE)
    let data = {
                   dates  : [],
                   values : []
                  }
  } 
  data.dates.unshift(dtn)
  data.values.unshift(actual_time)
  if (data.dates.length > 5){
    data.dates  = data.dates.slice(0, 5)
    data.values = data.values.slice(0, 5)
  }
  fs.writeFileSync(DATA_FILE, data, DATA_TYPE);
}

settings.onactivate = function(evt) {
  show_setTimeScreen()
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CO2 Table Countdown
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

start_CO2.onactivate = function(evt) {
  hide_all()
  calculate_CO2table()
  start_table()
  show_TableScreen()
}

// calculat the CO2 table. The apnea time here is 50% of the
// actual max time stored on the device
function calculate_CO2table(){
  let dict_in = read_data("actual.cbor")
  let actual = dict_in.actual_time
  let startvent  = 150
  let minvent    = 60
  for (var i = 0; i < max_cycles; i++){
    ventilate[i] = startvent - i*15 
    apnea[i]     = Math.max(minvent,Math.floor(actual/2))  
    hr_sum_hold[i] = 0
    hr_count_hold[i]  = 0
    hr_sum_breathe[i] = 0
    hr_count_breathe[i]  = 0  
  }
  mytable={
    ventilate:ventilate,
    apnea:apnea,
    hr_sum_hold:hr_sum_hold,
    hr_count_hold:hr_count_hold,
    hr_sum_breathe:hr_sum_breathe,
    hr_count_breathe:hr_count_breathe,
  }
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// O2 Table Countdown
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

start_O2.onactivate = function(evt) {
  hide_all()
  calculate_O2table()
  start_table()
  show_TableScreen()
}

// calculate the O2 table. Here the max holding time is 80% of
// the stored actual maximum breath holding time
function calculate_O2table(){
  let dict_in = read_data("actual.cbor")
  let actual = dict_in.actual_time
  let starthold  = Math.floor(actual*0.8) 
  let minhold    = 30
  let secs2decrease = 15
  for (var i = 0; i < 8; i++){
    ventilate[i] = 120 
    apnea[i]     = Math.max( minhold,(starthold - (7-i)*secs2decrease) )
    hr_sum_hold[i] = 0
    hr_count_hold[i]  = 0
    hr_sum_breathe[i] = 0
    hr_count_breathe[i]  = 0  
  }
  mytable={
    ventilate:ventilate,
    apnea:apnea,
    hr_sum_hold:hr_sum_hold,
    hr_count_hold:hr_count_hold,
    hr_sum_breathe:hr_sum_breathe,
    hr_count_breathe:hr_count_breathe,
  }
}

// start the countdowns 
function start_table(){
  // disable the screen as otherwise the countdowns will stop when the
  // screen is black
  display.autoOff = false
  display.brightnessOverride = "dim"
  
  total_time = 0
  for (var i = 0; i < max_cycles; i++){
    total_time = total_time + mytable.ventilate[i]
    total_time = total_time + mytable.apnea[i]
  }  
  reset_timer()
  countdown  = mytable.ventilate[0]
  counting   = true
  setInterval(update_table, 1 * 1000);
}


function update_table(){
   let tdiff_this_step = tdiff - tdiff_at_start
   let cycle = Math.floor(steps/2)
   if (cycle < max_cycles){
      // update total time display
      total_time_label.text = get_time_from_tdiff(total_time-tdiff)

      // update breathe time display
      if (steps%2 == 0){
        countdown =  mytable.ventilate[cycle] - tdiff_this_step
        if (countdown < 0){
          countdown = 0
        }
        breathe_time.text  = get_time_from_tdiff(countdown);
        rect_breathe.width = Math.floor(screen_dimx*(countdown/ mytable.ventilate[cycle]))
        // while the breathing countdown is running always show the holding bar
        // and also show the next holding time which is coming 
        rect_hold.width    = screen_dimx
        hold_time.text     = get_time_from_tdiff(mytable.apnea[cycle]);
        mytable.hr_sum_breathe[cycle]   = mytable.hr_sum_breathe[cycle] + parseInt(hr_label.text)
        mytable.hr_count_breathe[cycle] = mytable.hr_count_breathe[cycle] + 1
      }else{
      // update hold time display
        countdown =  mytable.apnea[cycle] - tdiff_this_step
        if (countdown < 0){
          countdown = 0
        }    
        hold_time.text   = get_time_from_tdiff(countdown);
        rect_hold.width  = Math.floor(screen_dimx*(countdown/ mytable.apnea[cycle]))
        mytable.hr_sum_hold[cycle]      = mytable.hr_sum_hold[cycle] + parseInt(hr_label.text)
        mytable.hr_count_hold[cycle]    = mytable.hr_count_hold[cycle] + 1
      }
      if (countdown == 10){
        vibration.start("ping");
      }
      if (countdown == 5){
        vibration.start("ping");
      }
      if (countdown == 1){
        vibration.start("bump");
      }

      // if one of the countdowns is through reset it 
      if (countdown <= 0){
        tdiff_at_start = tdiff
        steps++
      }
      // let the active circle blink
      if (tdiff%2 == 0){
        
        if (steps%2 == 0){
          circle_array[cycle].style.fill = color_breathe
        }else{
          circle_array[cycle].style.fill = color_hold
        }
      }else{
        circle_array[cycle].style.fill = "black"
      }

      // make sure that all old circles are black
      for (var i = 0; i < cycle; i++){
         circle_array[i].style.fill = "black"
      }
   
   // if all countdowns are done, display the mean heartbeat for each cycle
   // separated by breathing and breath holding
   }else{
      if (results_drawn == false){
        setInterval(update_table, 60*60*1000);
        display.autoOff = true
        display.brightnessOverride = "normal"
        
        // hide all elements which are not needed
        results_drawn = true
        total_time_label.style.display  = "none";
        breathe_time.style.display = "none";
        rect_breathe.style.display = "none";
        hold_time.style.display    = "none";
        rect_hold.style.display    = "none";
        hr_label.style.display     = "none";
        breathe_label.style.display = "none";
        hold_label.style.display    = "none";

        // stop counting
        counting = false

        // calculate the mean heart beat from the sum and the counts
        // monitored during the countdown
        let mean_hr_breathe = new Array();
        let mean_hr_hold    = new Array();
        for (var i = 0; i < max_cycles; i++){
          if ((mytable.hr_count_breathe[i] != 0) & (mytable.hr_sum_breathe[i]!=0)){
            mean_hr_breathe[i] = mytable.hr_sum_breathe[i]/mytable.hr_count_breathe[i]
          }else{
            mean_hr_breathe[i] = 1
          }
          if ((mytable.hr_count_hold[i] != 0)&(mytable.hr_sum_hold[i] != 0)){
            mean_hr_hold[i]    = mytable.hr_sum_hold[i]/mytable.hr_count_hold[i]
          }else{
            mean_hr_hold[i] = 1
          }
        } 
        // get the minimum and maximum values to scale the graph accordingly
        let min_hr = Math.min.apply(Math, mean_hr_hold)
        let max_hr = Math.max.apply(Math, mean_hr_hold)
        let min_hr = Math.min(min_hr,Math.min.apply(Math, mean_hr_breathe)) -10
        let max_hr = Math.max(max_hr,Math.max.apply(Math, mean_hr_breathe)) +30
        if (min_hr == max_hr){
          min_hr = min_hr-1
          max_hr = max_hr+1
        }

        // use the circle and line elements to show the course of the heartbeat
        // during the excercise
        // write in the top line for each cycle the values monitored during
        // breathing and below the values monitored during breath holding 
        for (var i = 0; i < max_cycles; i++){
           circle_array[i].r = 5
           circle_array[i].style.display = "inline"
           circle_array[i].style.fill = color_breathe
           circle_array[i].cy = screen_dimy-((mean_hr_breathe[i]-min_hr)/(max_hr-min_hr))*220
           hr_text_array[i].style.display = "inline"
           hr_text_array[i].x = circle_array[i].cx
           hr_text_array[i].y = 30
           if (i==0){
             hr_text_array[i].text = "b:"+Math.floor(mean_hr_breathe[i])
           }else{
             hr_text_array[i].text = Math.floor(mean_hr_breathe[i])
           }  
           hr_text_array[i].style.fontSize = 18
           hr_text_array[i].style.fill = color_breathe

           circle_array2[i].style.display = "inline"
           circle_array2[i].r = 5
           circle_array2[i].style.fill = color_hold
           circle_array2[i].cx = circle_array[i].cx
           circle_array2[i].cy = screen_dimy-((mean_hr_hold[i]-min_hr)/(max_hr-min_hr))*screen_dimy*0.9
           hr_text_array2[i].style.display = "inline"
           hr_text_array2[i].x = circle_array[i].cx
           hr_text_array2[i].y = 50
           if (i==0){
             hr_text_array2[i].text = "h:"+Math.floor(mean_hr_hold[i])
           }else{
             hr_text_array2[i].text = Math.floor(mean_hr_hold[i])
           }  
           hr_text_array2[i].style.fontSize = 18
           hr_text_array2[i].style.fill = color_hold
           if (i>0){
              line_array[i-1].style.display = "inline"
              line_array[i-1].x1 = circle_array[i-1].cx
              line_array[i-1].x2 = circle_array[i].cx
              line_array[i-1].y1 = circle_array[i-1].cy
              line_array[i-1].y2 = circle_array[i].cy
              line_array[i-1].style.fill = color_breathe

              line_array2[i-1].style.display = "inline"
              line_array2[i-1].x1 = circle_array2[i-1].cx
              line_array2[i-1].x2 = circle_array2[i].cx
              line_array2[i-1].y1 = circle_array2[i-1].cy
              line_array2[i-1].y2 = circle_array2[i].cy
              line_array2[i-1].style.fill = color_hold
           }    
        }
      }  
   }
}

// if the continue table button was pressed go on with the countdown 
continue_countdown.onactivate = function(evt) {
  counting = true
  display.autoOff = false
  display.brightnessOverride = "dim"
  continue_countdown.style.display = "none"
  stop_countdown.style.display     = "none"
  show_TableScreen()
}

// if the stop table button was pressed go back to the main screen
stop_countdown.onactivate = function(evt) {
  reset_timer()
  continue_countdown.style.display = "none"
  stop_countdown.style.display     = "none"
  hide_TableScreen()
  show_startScreen()
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// START APP
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

show_startScreen()
startWatch()

