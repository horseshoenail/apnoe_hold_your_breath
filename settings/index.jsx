function mySettings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">This ist the free_diver app</Text>}>
        {<Text bold align="center">  By using this app you acknowledge that
            you have read and understood the following: 
  You use the app and the tables on your own risk!
  Please be careful when using the tables as holding your breath 
  too long might restrict your reactions and can lead to fainting. Only
  use the tables/app when someone else is around and you are in a save 
  environment. Listen to your body and stop the table and breath holding
  when you feel weird.
         </Text>} 
        {<Text bold align="center"> 
  As the countdown does not work when the screen is off, the display is turned
  to “always on” mode while the tables are running. The device switches to 
  dim mode during this time. As the whole table might take 20 to 
  30 min this behavior is consuming battery and might influence your device. 
       </Text>} 
     </Section>
  </Page>
  );
}
registerSettingsPage(mySettings);
