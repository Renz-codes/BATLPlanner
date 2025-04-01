'use client';

import * as React from 'react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import { excosts } from "@/app/lib/excosts";
import { bossProperties } from "@/app/lib/stdata";

export default function FreeSolo({ label_text, default_text, setfunc, isStriker }) {
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
      <Autocomplete
        id={ "free-solo: " + label_text }
        freeSolo
        options={isStriker ? excosts.filter((item) => item.role === "striker").map((item) => item.name).sort() : excosts.filter((item) => item.role === "special").map((item) => item.name).sort()}
        renderInput={(params) => <TextField {...params} label={ label_text }/>}
        onInputChange={(_event, value, reason) => {
          setfunc(value);
        }}
        inputValue={default_text}
      />
    </Stack>
  );
}

export function FreeSoloForBattleTime({ default_text, setfunc }) {
  const battletimes = ["240","180"]
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
      <Autocomplete
        id={ "free-solo: 戦闘時間"}
        freeSolo
        options={battletimes}
        renderInput={(params) => <TextField {...params} label="戦闘時間"/>}
        onInputChange={(_event, value, reason) => {
          setfunc(value === ""? 0 : parseInt(value));
        }}
        inputValue={default_text !== 0 ? default_text.toString() : ''}
      />
    </Stack>
  );
}

export function FreeSoloForCostAtFirst({ default_text, setfunc }) {
  const costs = ["3.8"]
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
      <Autocomplete
        id={ "free-solo: 開幕コスト"}
        freeSolo
        options={costs}
        renderInput={(params) => <TextField {...params}  label="開幕コスト"/>}
        onInputChange={(_event, value, reason) => {
          setfunc(value === ""? 0.0 : parseFloat(value));
        }}
        inputValue={default_text !== 0 ? default_text.toString() : ''}
      />
    </Stack>
  );
}

export function FreeSoloForDifficulty({ default_text, setfunc }) {
  const difficulties = ["LUNATIC", "TORMENT", "INSANE", "EXPERT"];
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
      <Autocomplete
        id={ "free-solo: 難易度"}
        freeSolo
        options={difficulties}
        renderInput={(params) => <TextField {...params} label="難易度"/>}
        onInputChange={(_event, value, reason) => {
          setfunc(value);
        }}
        inputValue={default_text}
      />
    </Stack>
  );
}

export function FreeSoloForAnotherBattleTime({ default_text, setfunc }) {
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
      <TextField
          id="filled-number"
          label="他凸タイム"
          type="number"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          onChange={(e) => {
            setfunc(e.target.value);
          }}
          value={default_text !== 0 ? default_text.toString() : ''}
        />
    </Stack>
  );
}

export function FreeSoloForBossName({ setfunc, default_text }) {
  return (
    <Stack spacing={2} sx={{ width: 300 }}>
    <Autocomplete
      disablePortal
      id="combo-box-boss-name"
      options={bossProperties.map((boss) => boss.name).sort((a, b) => a.localeCompare(b))}
      freeSolo
      renderInput={(params) => 
        <TextField {...params} 
          label="ボス名" 
          variant="outlined" 
          InputLabelProps={{
            style: { fontSize: '0.9rem' }
          }}
        />
      }
      value={default_text || ''}
      onChange={(event, newValue) => {
        setfunc(newValue || 'その他');
      }}
    />
    </Stack>
  );
}
