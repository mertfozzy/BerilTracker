import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Font from 'expo-font';

// Firebase
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Index() {
  const [logs, setLogs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0); 
  const [showSheet, setShowSheet] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  // Arka planda font yükleme state'i (Ekranı kilitlemez)
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...MaterialCommunityIcons.font,
        });
      } catch (e) {
        console.warn("Font yükleme hatası:", e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();

    const q = query(collection(db, "logs"), orderBy("startTime", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getLogVolume = (log) => {
    if (log.type === 'SUT') return log.amount || 0;
    if (log.type === 'EMZIRME') {
      const duration = (log.endTime - log.startTime) / 60000;
      // Beril Algoritması: 5ml ilk 10dk, sonra 1ml
      return duration <= 10 ? Math.round(duration * 5) : Math.round(50 + (duration - 10));
    }
    return 0;
  };

  const getDayTotalStats = (targetDate) => {
    const filtered = logs.filter(l => isSameDay(new Date(l.startTime), targetDate));
    let ml = 0; filtered.forEach(log => { ml += getLogVolume(log); });
    return {
      ml,
      feeding: filtered.filter(l => l.type === 'EMZIRME' || l.type === 'SUT').length,
      diaper: filtered.filter(l => l.type === 'BEZ').length
    };
  };

  const openSheet = (type = "EMZIRME", log = null) => {
    const now = Date.now();
    if (log) { setEditingLog(log); } 
    else {
      setEditingLog({ 
        type, startTime: now, 
        endTime: type === 'BEZ' ? now : now + (15 * 60 * 1000), 
        side: type === 'EMZIRME' ? "Sol" : null,
        amount: type === 'SUT' ? 30 : null, 
        status: type === 'BEZ' ? [] : null 
      });
    }
    setShowSheet(true);
  };

  const handleSave = async (data) => {
    setShowSheet(false);
    setEditingLog(null);
    try {
      if (data.id) { await updateDoc(doc(db, "logs", data.id), data); } 
      else { await addDoc(collection(db, "logs"), { ...data, createdAt: serverTimestamp() }); }
    } catch (e) { Alert.alert("Hata", "Veri kaydedilemedi."); }
  };

  const sections = useMemo(() => {
    const groups = logs.reduce((acc, log) => {
      const date = format(new Date(log.startTime), "dd MMMM yyyy, EEEE", { locale: tr });
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {});
    return Object.keys(groups).map(date => ({ title: date, data: groups[date] }));
  }, [logs]);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderSection />
      
      <View style={styles.tabRow}>
        {["Günlük", "Gelişim", "Tahminler"].map((tab, i) => (
          <TouchableOpacity key={tab} style={[styles.tab, selectedTab === i && styles.activeTab]} onPress={() => setSelectedTab(i)}>
            <MaterialCommunityIcons name={i === 0 ? "format-list-bulleted" : i === 1 ? "chart-bar" : "auto-fix"} size={22} color={selectedTab === i ? "#90CAF9" : "#888"} />
            <Text style={[styles.tabText, selectedTab === i && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {selectedTab === 0 && (
          <View>
            <SummaryDashboard today={getDayTotalStats(new Date())} yesterday={getDayTotalStats(subDays(new Date(), 1))} />
            <ActionButtonsGrid onAction={(type) => openSheet(type)} />
            <View style={styles.divider} />
            {sections.map((section, idx) => (
              <View key={idx}>
                <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{section.title}</Text></View>
                {section.data.map(log => (
                  <LogCard key={log.id} log={log} onEdit={() => openSheet(log.type, log)} onDelete={() => deleteDoc(doc(db, "logs", log.id))} />
                ))}
              </View>
            ))}
          </View>
        )}
        {selectedTab === 1 && <GelisimScreen logs={logs} getLogVolume={getLogVolume} />}
        {selectedTab === 2 && <TahminlerScreen logs={logs} />}
      </ScrollView>

      <LogEditModal visible={showSheet} log={editingLog} onSave={handleSave} onCancel={() => { setShowSheet(false); setEditingLog(null); }} />
    </SafeAreaView>
  );
}

// --- ALT BİLEŞENLER ---

const HeaderSection = () => {
  const daysOld = Math.floor((new Date() - new Date(2026, 3, 17)) / 86400000);
  return (
    <View style={styles.header}>
      <Text style={styles.greeting}>Merhaba Mert & Gökçe ✨</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={styles.title}>Beril</Text>
        <Text style={styles.subtitle}>Bugün {daysOld} günlük!</Text>
      </View>
    </View>
  );
};

const SummaryDashboard = ({ today, yesterday }) => (
  <View style={styles.dashCard}>
    <View style={styles.statBox}><Text style={styles.statLabel}>Bugün</Text><Text style={styles.statValue}>🥛 {today.ml} ml</Text><Text style={styles.statValue}>🤱 {today.feeding} Besleme</Text><Text style={styles.statValue}>💩 {today.diaper} Bez</Text></View>
    <View style={styles.vDivider} />
    <View style={styles.statBox}><Text style={styles.statLabel}>Dün</Text><Text style={styles.statValue}>🥛 {yesterday.ml} ml</Text><Text style={styles.statValue}>🤱 {yesterday.feeding} Besleme</Text><Text style={styles.statValue}>💩 {yesterday.diaper} Bez</Text></View>
  </View>
);

const ActionButtonsGrid = ({ onAction }) => {
  const buttons = [
    { label: "Emzirme", type: "EMZIRME", icon: "heart", color: "#F48FB1" },
    { label: "Süt (Sağ)", type: "SUT", icon: "plus-circle", color: "#90CAF9" },
    { label: "Bez", type: "BEZ", icon: "refresh", color: "#A5D6A7" },
    { label: "Uyku", type: "UYKU", icon: "weather-night", color: "#CE93D8" },
  ];
  return (
    <View style={styles.grid}>{buttons.map(b => (
      <TouchableOpacity key={b.type} style={[styles.gridBtn, { backgroundColor: b.color + '25' }]} onPress={() => onAction(b.type)}>
        <MaterialCommunityIcons name={b.icon} size={28} color={b.color} /><Text style={{ color: b.color, fontWeight: 'bold', marginTop: 5 }}>{b.label}</Text>
      </TouchableOpacity>
    ))}</View>
  );
};

const LogCard = ({ log, onEdit, onDelete }) => (
  <TouchableOpacity style={styles.logCard} onPress={onEdit} activeOpacity={0.7}>
    <Text style={{ fontSize: 26 }}>{log.type === 'EMZIRME' ? '🤱' : log.type === 'SUT' ? '🍼' : log.type === 'BEZ' ? '💩' : '😴'}</Text>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={{ fontWeight: 'bold', color: '#fff' }}>{log.type}</Text>
      <Text style={styles.logSub}>{format(log.startTime, "HH:mm")} {log.type !== 'BEZ' ? `- ${format(log.endTime, "HH:mm")}` : ''}</Text>
      <Text style={[styles.logDetail, { color: '#90CAF9' }]}>
        {log.type === 'EMZIRME' ? `Taraf: ${log.side}` : 
         log.type === 'SUT' ? `Miktar: ${log.amount} ml` : 
         log.type === 'BEZ' ? `Durum: ${log.status?.join(", ")}` : ''}
      </Text>
    </View>
    <TouchableOpacity onPress={onDelete} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ padding: 10 }}>
      <MaterialCommunityIcons name="trash-can-outline" size={26} color="#ff5252" />
    </TouchableOpacity>
  </TouchableOpacity>
);

const GelisimScreen = ({ logs, getLogVolume }) => {
  const milkData = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const totalMl = logs.filter(l => isSameDay(new Date(l.startTime), date)).reduce((sum, l) => sum + getLogVolume(l), 0);
    return { label: format(date, "dd/MM"), value: totalMl };
  }).reverse(), [logs]);

  const sleepData = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const totalHours = logs.filter(l => l.type === 'UYKU' && isSameDay(new Date(l.startTime), date)).reduce((sum, l) => sum + (l.endTime - l.startTime) / 3600000, 0);
    return { label: format(date, "dd/MM"), value: totalHours };
  }).reverse(), [logs]);

  const maxMilk = Math.max(...milkData.map(d => d.value), 100);
  const maxSleep = Math.max(...sleepData.map(d => d.value), 12);

  return (
    <View style={styles.tabContent}>
      <View style={styles.chartCard}><Text style={styles.chartTitle}>Haftalık Beslenme (Tahmini ml)</Text><Text style={styles.chartSub}>Tahmin: İlk 10dk 5ml/dk, sonra 1ml/dk.</Text>
        <View style={styles.chartRow}>{milkData.map((d, i) => (
          <View key={i} style={styles.barContainer}>{d.value > 0 && <Text style={styles.barVal}>{d.value}</Text>}<View style={[styles.bar, { height: (d.value / maxMilk) * 80 + 5, backgroundColor: '#90CAF9' }]} /><Text style={styles.barLabel}>{d.label}</Text></View>
        ))}</View>
      </View>
      <View style={styles.chartCard}><Text style={styles.chartTitle}>Günlük Toplam Uyku (Saat)</Text>
        <View style={styles.chartRow}>{sleepData.map((d, i) => (
          <View key={i} style={styles.barContainer}>{d.value > 0 && <Text style={styles.barVal}>{d.value.toFixed(1)}</Text>}<View style={[styles.bar, { height: (d.value / maxSleep) * 80 + 5, backgroundColor: '#CE93D8' }]} /><Text style={styles.barLabel}>{d.label}</Text></View>
        ))}</View>
      </View>
    </View>
  );
};

const TahminlerScreen = ({ logs }) => {
  const forecast = useMemo(() => {
    const lastFeed = logs.find(l => l.type === 'EMZIRME' || l.type === 'SUT');
    const lastSleep = logs.find(l => l.type === 'UYKU');
    const nextFeeding = lastFeed ? format(new Date(lastFeed.startTime + 3 * 60 * 60 * 1000), "HH:mm") : "--:--";
    let awakeTime = "0s 0dk";
    if (lastSleep) {
      const diffMs = Date.now() - lastSleep.endTime;
      awakeTime = `${Math.floor(diffMs / 3600000)}s ${Math.floor((diffMs % 3600000) / 60000)}dk`;
    }
    const sol = logs.filter(l => l.side === 'Sol').length;
    const sag = logs.filter(l => l.side === 'Sağ').length;
    const total = (sol + sag) || 1;
    return { nextFeeding, awakeTime, solRatio: sol / total, sagRatio: sag / total };
  }, [logs]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.predictCard}><Text style={styles.chartTitle}>Beril için tahminler ✨</Text>
        <View style={styles.predictRow}>
          <View style={styles.predictItem}><MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#90CAF9" /><Text style={styles.predictLabel}>Acıkma Tahmini</Text><Text style={styles.predictValue}>{forecast.nextFeeding}</Text></View>
          <View style={styles.vDividerLight} />
          <View style={styles.predictItem}><MaterialCommunityIcons name="white-balance-sunny" size={24} color="#FFB74D" /><Text style={styles.predictLabel}>Uyanıklık Süresi</Text><Text style={styles.predictValue}>{forecast.awakeTime}</Text></View>
        </View>
      </View>
      <View style={styles.predictCard}><Text style={styles.chartTitle}>Emzirme Taraf Dengesi</Text>
        <View style={styles.balanceBar}><View style={{ flex: forecast.solRatio, backgroundColor: '#F48FB1', height: 10, borderRadius: 5 }} /><View style={{ width: 5 }} /><View style={{ flex: forecast.sagRatio, backgroundColor: '#90CAF9', height: 10, borderRadius: 5 }} /></View>
        <View style={styles.predictRow}><Text style={{ color: '#F48FB1', fontWeight: 'bold' }}>Sol: %{(forecast.solRatio * 100).toFixed(0)}</Text><Text style={{ color: '#90CAF9', fontWeight: 'bold' }}>Sağ: %{(forecast.sagRatio * 100).toFixed(0)}</Text></View>
      </View>
    </View>
  );
};

const LogEditModal = ({ visible, log, onSave, onCancel }) => {
  if (!log) return null;
  const [data, setData] = useState({ ...log });
  const [pickerMode, setPickerMode] = useState(null);

  const toggleStatus = (s) => {
    let st = [...(data.status || [])];
    st = st.includes(s) ? st.filter(x => x !== s) : [...st, s];
    setData({...data, status: st});
  };

  // Web'de Native HTML Input onChange handle etme
  const handleTimeChangeWeb = (type, timeStr) => {
    if (!timeStr) return;
    const [hours, minutes] = timeStr.split(':');
    const newDate = new Date(type === 'start' ? data.startTime : data.endTime);
    newDate.setHours(parseInt(hours), parseInt(minutes));
    setData({ ...data, [type === 'start' ? 'startTime' : 'endTime']: newDate.getTime() });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{data.type} Girişi</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}><Text style={styles.label}>Başlangıç</Text>
                {Platform.OS === 'web' ? (
                  <input 
                    type="time" 
                    value={format(data.startTime, "HH:mm")} 
                    onChange={(e) => handleTimeChangeWeb('start', e.target.value)} 
                    style={webInputStyle} 
                  />
                ) : (
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setPickerMode('start')}>
                    <Text style={{ fontWeight: 'bold', color: '#fff' }}>{format(data.startTime, "HH:mm")}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {data.type !== 'BEZ' && (
                <View style={{ flex: 1, marginLeft: 15 }}><Text style={styles.label}>Bitiş</Text>
                  {Platform.OS === 'web' ? (
                    <input 
                      type="time" 
                      value={format(data.endTime, "HH:mm")} 
                      onChange={(e) => handleTimeChangeWeb('end', e.target.value)} 
                      style={webInputStyle} 
                    />
                  ) : (
                    <TouchableOpacity style={styles.timeBtn} onPress={() => setPickerMode('end')}>
                      <Text style={{ fontWeight: 'bold', color: '#fff' }}>{format(data.endTime, "HH:mm")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            
            {Platform.OS !== 'web' && pickerMode && (
              <DateTimePicker 
                value={new Date(pickerMode === 'start' ? data.startTime : data.endTime)} 
                mode="time" display="spinner" is24Hour={true} 
                onChange={(e, d) => { setPickerMode(null); if(d) setData({ ...data, [pickerMode === 'start' ? 'startTime' : 'endTime']: d.getTime() }) }} 
              />
            )}
            
            {data.type === 'SUT' && (
              <View style={styles.section}><Text style={styles.label}>Miktar (ml)</Text><View style={styles.chipRow}>{[20, 30, 45, 60, 90, 120].map(m => (
                <TouchableOpacity key={m} style={[styles.chip, data.amount === m && styles.activeChip]} onPress={() => setData({ ...data, amount: m })}><Text style={[styles.chipText, data.amount === m && { color: '#fff' }]}>{m}</Text></TouchableOpacity>
              ))}</View></View>
            )}
            {data.type === 'BEZ' && (
              <View style={styles.section}><Text style={styles.label}>Durum</Text><View style={styles.chipRow}>{["Az Çişli", "Çok Çişli", "Kakalı"].map(s => (
                <TouchableOpacity key={s} style={[styles.chip, data.status?.includes(s) && styles.activeChip]} onPress={() => toggleStatus(s)}><Text style={[styles.chipText, data.status?.includes(s) && { color: '#fff' }]}>{s}</Text></TouchableOpacity>
              ))}</View></View>
            )}
            {data.type === 'EMZIRME' && (
              <View style={styles.section}><Text style={styles.label}>Hangi Taraf?</Text><View style={styles.chipRow}>{["Sol", "Sağ", "İkisi"].map(s => (
                <TouchableOpacity key={s} style={[styles.chip, data.side === s && styles.activeChip]} onPress={() => setData({ ...data, side: s })}><Text style={[styles.chipText, data.side === s && { color: '#fff' }]}>{s}</Text></TouchableOpacity>
              ))}</View></View>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(data)}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kaydet</Text></TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Web için özel Native Input Stili
const webInputStyle = {
  backgroundColor: '#2a3243',
  color: '#fff',
  padding: '12px',
  borderRadius: '15px',
  border: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  width: '100%',
  textAlign: 'center',
  cursor: 'pointer'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121621' },
  header: { padding: 24, paddingTop: 60 },
  greeting: { color: '#aaa', fontSize: 13 },
  title: { fontSize: 36, fontWeight: '900', color: '#90CAF9' },
  subtitle: { fontSize: 18, color: '#fff', marginLeft: 10, fontWeight: 'bold', opacity: 0.8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: '#90CAF9' },
  tabText: { color: '#888', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  activeTabText: { color: '#fff' },
  dashCard: { flexDirection: 'row', backgroundColor: '#1a2233', margin: 16, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#2a3243' },
  statBox: { flex: 1 },
  statLabel: { color: '#90CAF9', fontWeight: 'bold', fontSize: 11, marginBottom: 8 },
  statValue: { color: '#fff', fontSize: 13, marginBottom: 4, fontWeight: '500' },
  vDivider: { width: 1, backgroundColor: '#2a3243', marginHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, justifyContent: 'space-between' },
  gridBtn: { height: 95, width: '47%', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  sectionHeader: { backgroundColor: '#1a2233', paddingVertical: 6, paddingHorizontal: 20 },
  sectionHeaderText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  logCard: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 6, padding: 18, backgroundColor: '#1a2233', borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2a3243' },
  logSub: { fontSize: 12, color: '#888', marginTop: 2 },
  logDetail: { fontSize: 12, fontWeight: 'bold', color: '#90CAF9', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#2a3243', marginVertical: 10 },
  tabContent: { padding: 16 },
  chartCard: { backgroundColor: '#1a2233', padding: 20, borderRadius: 20, marginBottom: 16 },
  chartTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  chartSub: { color: '#888', fontSize: 11, marginBottom: 15 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingBottom: 10 },
  barContainer: { alignItems: 'center', flex: 1 },
  bar: { width: 22, borderRadius: 6 },
  barVal: { color: '#fff', fontSize: 9, marginBottom: 4 },
  barLabel: { color: '#888', fontSize: 9, marginTop: 4 },
  predictCard: { backgroundColor: '#1a2233', padding: 20, borderRadius: 20, marginBottom: 16 },
  predictRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  predictItem: { flex: 1, alignItems: 'center' },
  predictLabel: { color: '#aaa', fontSize: 10, marginBottom: 5 },
  predictValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  vDividerLight: { width: 1, backgroundColor: '#2a3243', height: 40 },
  balanceBar: { flexDirection: 'row', height: 10, marginVertical: 15, backgroundColor: '#2a3243', borderRadius: 5, overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a2233', borderRadius: 30, padding: 25, width: '92%', maxHeight: '85%', borderWidth: 1, borderColor: '#2a3243' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 25 },
  label: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  timeRow: { flexDirection: 'row' },
  timeBtn: { backgroundColor: '#2a3243', padding: 15, borderRadius: 15, alignItems: 'center' },
  section: { marginTop: 25 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 15, backgroundColor: '#2a3243' },
  activeChip: { backgroundColor: '#90CAF9' },
  chipText: { color: '#aaa', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#90CAF9', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 35 }
});