// OpenMotics Driver
// Copyright 2015 OpenMotics bvba
//

System.Print("Initializing OpenMotics Serial Driver\r\n");

//
//  Globals
//
var g_debug = Config.Get("DebugTrace") == "true";
var g_comm = new Serial(OnCommRx, parseInt(Config.Get("SerialPort"), 10), parseInt(Config.Get("BaudRate"), 10), 8, 1, "None", "None");
//g_comm.AddRxFraming("StopChar","\r\n");
var g_timer = new Timer();
var g_timerInterval = 30000;
var g_timer2 = new Timer();
var g_timerInterval2 = 1000;

var OutputOnOff=new Array(240);
var OutputOnOffOld=new Array(240);
var LightsOn=0;
var OutputsOn=0;
var Dimmerx=new Array(240);
var DimmerxOld=new Array(240);
var OutputType=new Array(240);
var OutputLight=new Array(240);
var OutputMax=8;
var OutputCount=0;
var CID=0;
var ThermostatSetpoint=new Array(24);
var ThermostatSetpointOld=new Array(24);
var ThermostatTemperature=new Array(24);
var ThermostatTemperatureOld=new Array(24);
var ThermostatOutputA=new Array(24);
var ThermostatOutputAOld=new Array(24);
var ThermostatOutputB=new Array(24);
var ThermostatOutputBOld=new Array(24);
var ThermostatHeatingA=new Array(24);
var ThermostatHeatingAOld=new Array(24);
var SensorNr = new Array(24);
var OutputNr = new Array(24);
var Output2Nr = new Array(24);
var ThermostatName = new Array(24);
var OutsideTemperature=255;
var OutsideTemperatureOld=255;
var ThermostatMode=0;
var ThermostatModeOld=0;
var MessageInProgress="OK";
var data1="data to receive";
var ResetOk=0;
var LastDimmer=0;
var CrcOk=0;
var RsNr=0;
var RsNrMax=0;
//
//  Startup Code
//

ResetValues();
g_timer.Start(OnTimer,35000);
g_timer2.Start(OnTimer2,8000);
SendOL();

//
//  Internal Functions
//

function OnCommRx(data)
{
    if (MessageInProgress=="OK") {
      data1=data;
    }
    else {
      data1=data1+data;
    }
    ResetOk=0;
    var length = data1.length;
    var t = 0;
    var i = 0;
    var OutputNr = 0;
    var DimmerValue = 0;
    var Nroutputs = 0;
    //System.Print("Message received, length="+ length + "\r\n");
    for ( t=0 ; t<5 ; t++) {  //Search where the first valid characters are found
      if (data1.charCodeAt(0+t)==79 && data1.charCodeAt(1+t)==76) {      //"OL"
        Nroutputs = data1.charCodeAt(3+t);
        System.Print("-> OL: Nr of outputs ="+Nroutputs+ " Length="+length+" \r\n");
        if (length>((Nroutputs*2)+5+t)) {
          MessageInProgress="OK";
          if (data1.charCodeAt(4+t+(2*Nroutputs))==13 && data1.charCodeAt(5+t+(2*Nroutputs))==10) {
            LightsOn=0;
            OutputsOn=0;
            //System.Print("Nr of Outputs="+ Nroutputs + "\r\n");
            for ( i=1 ; i<(Nroutputs+1) ; i++ ) {
              //System.Print("Nroutputs="+Nroutputs+" t="+t+" i="+i+" Output="+ data1.charCodeAt(4+t+(i-1)*2) + " value=" + data1.charCodeAt(5+t+(i-1)*2) + "\r\n");  
              OutputNr = data1.charCodeAt(4+t+(i-1)*2);
              DimmerValue = data1.charCodeAt(5+t+(i-1)*2);
              OutputOnOff[OutputNr] = 1;
              if (isNaN(DimmerValue)==false && isNaN(OutputNr)==false && OutputNr<OutputMax) {
                if (ResetOk==0) {ResetValues();}
                Dimmerx[OutputNr] = DimmerValue;
                OutputOnOff[OutputNr] = 1;
                System.Print("Output Nr="+ OutputNr + " Light=" + OutputLight[OutputNr] + " Type=" + OutputType[OutputNr] + "\r\n");
                if (OutputLight[OutputNr]==1) {
                  LightsOn++;
                }
                if (OutputLight[OutputNr]==0) {
                  OutputsOn++;
                }
              }
              else {
                //System.Print("Nroutputs="+Nroutputs+" t="+t+" i="+i+" Output="+ data1.charCodeAt(4+t+(i-1)*2) + " value=" + data1.charCodeAt(5+t+(i-1)*2) + "\r\n");
              }
            }
            System.Print("Nr of Lights="+ LightsOn + " Nr of Outputs="+ OutputsOn + "\r\n");
            SystemVars.Write("LIGHTSON",LightsOn);
            SystemVars.Write("OUTPUTSON",OutputsOn);
          }
          else {
            System.Print("************* FOUT ************************** t=" + t + " " + data1.charCodeAt(0+t) + " " + data1.charCodeAt(1+t) + " " + data1.charCodeAt(2+t) + " " + data1.charCodeAt(3+t) + " END " + data1.charCodeAt(4+(2*Nroutputs))+ " "+ data1.charCodeAt(5+(2*Nroutputs))+ " " + data1.charCodeAt(6+(2*Nroutputs))+"\r\n");
          }
        }
        else {
          MessageInProgress="OL";
        }
        t=100;  //Exit loop
        WriteValues();
        WriteValues2();
      }
      if (data1.charCodeAt(0+t)==116 && data1.charCodeAt(1+t)==108) {      //"tl"
        //System.Print("tl detected, length="+length+" t=" + t + "\r\n");
        if (length > 55) {
          MessageInProgress="OK";
          ThermostatMode = data1.charCodeAt(3+t);
          OutsideTemperature = data1.charCodeAt(4+t);
          for ( i=0 ; i<24 ; i++ ) {
            ThermostatSetpoint[i] = data1.charCodeAt(29+i+t);
            ThermostatTemperature[i] = data1.charCodeAt(5+i+t);
            if (ThermostatTemperature[i] == 255) {
              ThermostatTemperature[i] = "NC";
            }
            //System.Print("i=" + i + " ThermostatTemperature=" + ThermostatTemperature[i] + " ThermostatSetpoint=" + ThermostatSetpoint[i] + "\r\n");
          }
        }
        else {
          MessageInProgress="tl";
        }
        t=100;  //Exit loop
        WriteTemp();
        if (OutputCount<OutputMax) {Sendro(OutputCount)};
      }
      if (data1.charCodeAt(0+t)==82 && data1.charCodeAt(1+t)==83) {      //"RS"
        //System.Print("RS detected, length="+length+" t=" + t + "\r\n");
        if (length > 72) {
          MessageInProgress="OK";
          CheckRS(data1,t);
          //ThermostatMode = data1.charCodeAt(3+t);
          //OutsideTemperature = data1.charCodeAt(4+t);
        }
        else {
          MessageInProgress="RS";
        }
        t=100;  //Exit loop
        WriteTemp2();
      }
      if (data1.charCodeAt(0+t)==114 && data1.charCodeAt(1+t)==111) {      //"ro"
        //System.Print("ro detected, length="+length+" t=" + t + "\r\n");
        if (length > 36) {
          MessageInProgress="OK";
          Checkro(data1,t);
        }
        else {
          MessageInProgress="ro";
        }
        t=100;  //Exit loop
        //WriteTemp2();
      }
      if (data1.charCodeAt(0+t)==69 && data1.charCodeAt(1+t)==86) {      //"EV"
        if (length > 10) {
          MessageInProgress="OK";
          //System.Print("EV detected, length="+length+" t=" + t + "\r\n");
          var Event = data1.charCodeAt(3+t);
          if (Event>-1 && Event<256) {  				//Within range
            System.Print("Event set "+ Event +"\r\n");
            System.SignalEvent("EVENT_CODE" + Event);
          }
        }
        else {
          MessageInProgress="EV";
        }
        t=100;  //Exit loop
      }	
    }
}

function CheckRS(data1,t)
  { 
     crc1= data1.charCodeAt(70+t);
     crc2= data1.charCodeAt(71+t);
     crc3= data1.charCodeAt(72+t);
     crcstart=2+t;
     crcstop=69+t;
     
     CRC_Check(t,crc1,crc2,crc3,crcstart,crcstop,data1);
     
     if (CrcOk==1) { 
       //System.Print("Start analyzing RS...\r\n");  
       var RecNumber = data1.charCodeAt(2+t);
       if (RsNr==RecNumber) {RsNr++;}
       //CurrentTemp = data1.charCodeAt(3+t);
       //CurrentSetp = data1.charCodeAt(4+t);	
       //ProgrammedSetp[0] = data1.charCodeAt(5+t);
       //ProgrammedSetp[1] = data1.charCodeAt(6+t);
       //ProgrammedSetp[2] = data1.charCodeAt(7+t);
       //ProgrammedSetp[3] = data1.charCodeAt(8+t);
       //ProgrammedSetp[4] = data1.charCodeAt(9+t);
       //ProgrammedSetp[5] = data1.charCodeAt(10+t);
       SensorNr[RecNumber] = data1.charCodeAt(11+t);
       OutputNr[RecNumber] = data1.charCodeAt(12+t);
       Output2Nr[RecNumber] = data1.charCodeAt(13+t);
       //OutputValue = data1.charCodeAt(14+t);
       //Output2Value = data1.charCodeAt(15+t);
       //OutsideTemp = data1.charCodeAt(16+t);
       //ThermostatMode = data1.charCodeAt(17+t);
       ThermostatName[RecNumber] = data1.substr(18+t,16);
       System.Print("Thermostat Nr"+ RecNumber + " " + ThermostatName[RecNumber] + " " + SensorNr[RecNumber]+ " " + OutputNr[RecNumber] + " " + Output2Nr[RecNumber] + "\r\n");
       SystemVars.Write("ThermostatName"+RecNumber,ThermostatName[RecNumber]); 
       //Kp= data1.charCodeAt(34+t);
       //Ki= data1.charCodeAt(35+t);
       //Kd= data1.charCodeAt(36+t);
       //It= data1.charCodeAt(37+t);
       //Thr= data1.charCodeAt(38+t);
       //Days= data1.charCodeAt(39+t);
       //Hours= data1.charCodeAt(40+t);
       //Minutes= data1.charCodeAt(41+t);
     } 
  }

function Checkro(data1,t)
  { 
     crc1= data1.charCodeAt(34+t);
     crc2= data1.charCodeAt(35+t);
     crc3= data1.charCodeAt(36+t);
     crcstart=2+t;
     crcstop=33+t;
     
     CRC_Check(t,crc1,crc2,crc3,crcstart,crcstop,data1);
     
     if (CrcOk==1) { 
       //System.Print("Start analyzing ro...\r\n");  
       var RecNumber = data1.charCodeAt(3);
       if (RecNumber<240 && RecNumber==OutputCount) {
           OutputType[RecNumber] = data1.charCodeAt(4);
           OutputLight[RecNumber] = data1.charCodeAt(5);
           OutputMax = (data1.charCodeAt(12))*8;
           System.Print(RecNumber + " OutputCount="+ OutputCount + " OutputType="+ OutputType[RecNumber] + " OutputLight=" + OutputLight[RecNumber] + "\r\n");
           OutputCount++
       }
     }
  if (OutputCount<OutputMax) {Sendro(OutputCount)};
  }

function CRC_Check(t,crc1,crc2,crc3,crcstart,crcstop,data1)
{
  var CrcTemp=0;
  var CrcCalc=0;
  CrcOk=1;   //1-> CRC ok, 0-> message corrupt
  var CRC=1;
  var i=0;
   if (crc1="C") { //C command found?
     //System.Print("C found...\r\n");
     i=crcstart;
     if (crc2 === null || crc3 === null) { //CRC received is valid?
       CrcOk=0;   //Character not OK
       i=crcstop;  //Exit
       System.Print("CRC bytes not OK...\r\n");         
     }
     else {  //CRC is a valid number   
       CRC=((crc2)*256)+crc3;
       //System.Print("CRC bytes OK...\r\n");
     }
     while (i<(crcstop+1)) { //Check all data in data1 and calculate CRC
       CrcTemp = data1.charCodeAt(i+t);
       if (CrcTemp === undefined) { //Valid Character?
         CrcOk=0;   //Character not OK
         i=crcstop;  //Exit 
       } 
       if (CrcTemp === null) { //Valid Character?
         CrcOk=0;   //Character not OK
         i=crcstop;  //Exit 
       } 
       if (CrcTemp>-1 && CrcTemp<256) { //Character in byte range?
         CrcCalc=CrcCalc+CrcTemp;
       }
       else { //Wrong character, exit
         CrcOk=0;   //CRC not OK
         i=crcstop;  //Exit 
       }
       i++;
     }
   }
   else {           //No C command found so message is corrupt
     CrcOk=0; //CRC not OK
     System.Print("C NOT found...\r\n");
   }
   if (CrcCalc !== CRC) { //CRC wrong thus message corrupt
     CrcOk=0;
     System.Print("CRC WRONG !!!\r\n");
   }
   else {
     //System.Print("CRC CORRECT !!!\r\n");
   }
}

function OnTimer()
{
    Sendtl();
    g_timer.Start(OnTimer, g_timerInterval);
}

function OnTimer2()
{
    //System.Print("Ping "+RsNr+" "+RsNrMax+ " !!!\r\n");
    //RsNr++;
    ThermostatDetails(RsNr);
    RsNrMax++;
    if (RsNr<24 && RsNrMax<100) {
      g_timer2.Start(OnTimer2, g_timerInterval2);
    }
    else {
      Sendro(OutputCount);
    }
}

//
//  External Functions
//

function WriteValues()
{
    var t=0
    for ( t=0 ; t<240 ; t++) {
      if ((OutputOnOff[t] != OutputOnOffOld[t]) || (Dimmerx[t] != DimmerxOld[t])) {
        var x = Math.round(Dimmerx[t]*1.59);
        if (OutputOnOff[t] == 0) {
          SystemVars.Write("Output"+t,"OFF");
          SystemVars.Write("OutputState"+t,false);
        }
        else 
        {
          SystemVars.Write("Output"+t,"ON " + x + "%");
          SystemVars.Write("OutputState"+t,true);
        }
        SystemVars.Write("Dimmer"+t,Dimmerx[t]);
        OutputOnOffOld[t] = OutputOnOff[t];
        DimmerxOld[t] = Dimmerx[t];
      }
   }
}

function WriteValues2()
{
    var t=0
    for ( t=0 ; t<24 ; t++) {
      var a = SensorNr[t];
      var b = OutputNr[t];
      var c = Output2Nr[t];
      ThermostatOutputA[t] = Dimmerx[b];
      ThermostatOutputB[t] = Dimmerx[c];
      if (ThermostatOutputA[t] != ThermostatOutputAOld[t]) {
        if (b<240) {
          var x = Math.round(ThermostatOutputA[t]*1.59);
          SystemVars.Write("ThermostatOutA"+t, x + "%");
          if (x>0) {
            ThermostatHeatingA[t]=1;
          }
          else {
            ThermostatHeatingA[t]=0;
          }
          if (ThermostatHeatingAOld[t] != ThermostatHeatingA[t]) {
            ThermostatHeatingAOld[t] = ThermostatHeatingA[t];
            if (ThermostatHeatingA[t]==1) {
              SystemVars.Write("ThermostatHeating"+t,true);
            }
            else {
              SystemVars.Write("ThermostatHeating"+t,false);
            }
          }
        }
        else {
          SystemVars.Write("ThermostatOutA"+t," ");
        } 
        ThermostatOutputAOld[t]=ThermostatOutputA[t];
      }
      if (ThermostatOutputB[t] != ThermostatOutputBOld[t]) {
        if (c<240) {
          var x = Math.round(ThermostatOutputB[t]*1.59);
          SystemVars.Write("ThermostatOutB"+t, x + "%");
        }
        else {
          SystemVars.Write("ThermostatOutB"+t," ");
        }
        ThermostatOutputBOld[t]=ThermostatOutputB[t];
      }
   }
}

function WriteTemp()
{
    var t=0;
    var x=0;
    if (OutsideTemperature != OutsideTemperatureOld) {
      if (OutsideTemperature == 255) {
        x = "NC";
      }
      else 
      {
        x = (OutsideTemperature)/2-32;
      }
      SystemVars.Write("OutsideTemperature", x +"°C");
      OutsideTemperatureOld=OutsideTemperature;
    }
    if (ThermostatMode != ThermostatModeOld) {
      SystemVars.Write("ThermostatModeInt",ThermostatMode);
      if (ThermostatMode<128) {
        SystemVars.Write("ThermostatMode", "OFF");
        SystemVars.Write("ThermostatOn",false);
      }  
      if (ThermostatMode>135) {
        SystemVars.Write("ThermostatMode", "AUTOMATIC");
        SystemVars.Write("ThermostatOn",true);
        SystemVars.Write("ThermostatModeAuto",true);
        SystemVars.Write("ThermostatModeManual",false);
        SystemVars.Write("ThermostatModeParty",false);
        SystemVars.Write("ThermostatModeAway",false);
        SystemVars.Write("ThermostatModeVacation",false);
      } 
      if (ThermostatMode>127 && ThermostatMode<136) {
        if (ThermostatMode == 131) {
          SystemVars.Write("ThermostatMode", "AWAY");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",false);
          SystemVars.Write("ThermostatModeAway",true);
          SystemVars.Write("ThermostatModeVacation",false);
        }
        if (ThermostatMode == 132) {
          SystemVars.Write("ThermostatMode", "VACATION");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",false);
          SystemVars.Write("ThermostatModeAway",false);
          SystemVars.Write("ThermostatModeVacation",true);
        }
        if (ThermostatMode == 133) {
          SystemVars.Write("ThermostatMode", "PARTY");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",true);
          SystemVars.Write("ThermostatModeAway",false);
          SystemVars.Write("ThermostatModeVacation",false);
        }
        if (ThermostatMode == 128) {
          SystemVars.Write("ThermostatMode", "MANUAL");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",false);
          SystemVars.Write("ThermostatModeAway",false);
          SystemVars.Write("ThermostatModeVacation",false);
        }
        if (ThermostatMode == 129) {
          SystemVars.Write("ThermostatMode", "MANUAL");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",false);
          SystemVars.Write("ThermostatModeAway",false);
          SystemVars.Write("ThermostatModeVacation",false);
        }
        if (ThermostatMode == 130) {
          SystemVars.Write("ThermostatMode", "MANUAL");
          SystemVars.Write("ThermostatOn",true);
          SystemVars.Write("ThermostatModeAuto",false);
          SystemVars.Write("ThermostatModeManual",true);
          SystemVars.Write("ThermostatModeParty",false);
          SystemVars.Write("ThermostatModeAway",false);
          SystemVars.Write("ThermostatModeVacation",false);
        }
      }
      ThermostatModeOld = ThermostatMode; 
    }
    for ( t=0 ; t<24 ; t++) {
      if (ThermostatTemperature[t] != ThermostatTemperatureOld[t]) {
        if (SensorNr[t]==240) {  //TBS function
          SystemVars.Write("Temperature"+t, "TBS");
        }
        else {
          x=((ThermostatTemperature[t])/2)-32;
          SystemVars.Write("Temperature"+t, x +"°C");
        }
        ThermostatTemperatureOld[t]=ThermostatTemperature[t];
      }
      if (ThermostatSetpoint[t] != ThermostatSetpointOld[t]) { 
        if (SensorNr[t]==240) {  //TBS function
          if (ThermostatSetpoint[t]>107) {SystemVars.Write("Setpoint"+t,"ON");}
          if (ThermostatSetpoint[t]<98) {SystemVars.Write("Setpoint"+t,"OFF");}
        }
        else { 
          x=((ThermostatSetpoint[t])/2)-32;
          SystemVars.Write("Setpoint"+t, x +"°C");
        }
        ThermostatSetpointOld[t]=ThermostatSetpoint[t];
      }
    }
    //System.Print("Write Temp \r\n");
}

function WriteTemp2()
{

}

function ResetValues()
{ 
  ResetOk=1;
  var r=0;
  for ( r=0 ; r<240 ; r++ ) {
    OutputOnOff[r]=0;
    Dimmerx[r]=0;
  }
}

function SendString(string)
{
    if (g_debug) System.Print("Serial: SendString ("+string+")\r\n");
    
    g_comm.Write(string);
}

function Sendtl()
{
//  System.Print("Instruction tl\r\n");
  g_comm.Write("STRtl                    \r\n");
}

function SendOL()
{
//  System.Print("Instruction OL\r\n");
  g_comm.Write("STROL                    \r\n");
}

function Sendro(OutputNumber)
{
//  System.Print("Instruction ro\r\n");
  g_comm.Write("STRro"+String.fromCharCode(CID)+String.fromCharCode(OutputNumber)+"                    \r\n");
}

function ThermostatUp(ThermostatNr)
{
  if (SensorNr[ThermostatNr]==240) { //TBS
    var ActionType = 149;
    var ActionNumber = ThermostatNr;
  }
  else {
    var ActionType = 143;
    var ActionNumber = ThermostatNr;
  }
  BasicAction(ActionType,ActionNumber);
  System.Sleep(80);
  Sendtl();  
}

function ThermostatDown(ThermostatNr)
{
  if (SensorNr[ThermostatNr]==240) { //TBS
    var ActionType = 148;
    var ActionNumber = ThermostatNr;
    System.Print("TBS " + ActionType + " " + ActionNumber + "\r\n");
  }
  else {
    var ActionType = 142;
    var ActionNumber = ThermostatNr;
    System.Print("Normal " + ActionType + " " + ActionNumber + "\r\n");
  }
  BasicAction(ActionType,ActionNumber);
  System.Sleep(80);
  Sendtl();
}

function SetThermostatAway()
{
  var ActionType = 140;
  var ActionNumber = 131;
  BasicAction(ActionType,ActionNumber);
  System.Sleep(200);
  Sendtl();
}

function SetThermostatVacation()
{
  var ActionType = 140;
  var ActionNumber = 132;
  BasicAction(ActionType,ActionNumber);
  System.Sleep(200);
  Sendtl();
}

function SetThermostatParty()
{
  var ActionType = 140;
  var ActionNumber = 133;
  BasicAction(ActionType,ActionNumber);
  System.Sleep(200);
  Sendtl();
}

function SetThermostatAutomatic()
{
  var ActionType = 141;
  var ActionNumber = 1;
  BasicAction(ActionType,ActionNumber);
  System.Sleep(200);
  Sendtl();
}

function ThermostatDetails(ThermostatNr)
{
  g_comm.Write("STRRS "+ThermostatNr+"                   \r");
}

function OutputOn(OutputNumber)
{   
    g_comm.Write("STRIFQ 161 "+OutputNumber+"               \r");
    LastDimmer=OutputNumber;
}

function SelectLastDimmer(OutputNumber)
{   
    LastDimmer=OutputNumber;
}

function OutputOff(OutputNumber)
{   
    g_comm.Write("STRIFQ 160 "+OutputNumber+"               \r");
}

function ToggleOutput(OutputNumber)
{   
    g_comm.Write("STRIFQ 162 "+OutputNumber+"               \r");
    LastDimmer=OutputNumber;
}

function BasicAction(ActionType,ActionNumber)
{   
    g_comm.Write("STRIFQ "+ActionType+" "+ActionNumber+"               \r");
}

function SetDimmer(OutputNumber,DimmerValue)
{   
    g_comm.Write("STRIFD "+OutputNumber+" "+DimmerValue+"               \r");
    LastDimmer=OutputNumber;
    //System.Print("IFD "+OutputNumber+" "+DimmerValue+"\r\n");
}

function OutputDimUp()
{   
    g_comm.Write("STRIFQ 154 "+LastDimmer+"               \r");
}

function OutputDimDown()
{   
    g_comm.Write("STRIFQ 157 "+LastDimmer+"               \r");
}

