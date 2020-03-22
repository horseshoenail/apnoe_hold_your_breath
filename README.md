# apnoe_hold_your_breath
// developer:            horseshoenail
// Version:              1.0
// date of last version: 22.3.2020

This FITBIT apps helps you to increase your maximum breath holding time for e.g. free diving.

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
  - So far it’s only available for FITBIT IONIC

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


