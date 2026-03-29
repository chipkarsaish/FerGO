import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import NeumorphicView from '../components/NeumorphicView';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;
const cardPadding = isLargeScreen ? 24 : 16;
const cardMargin = isLargeScreen ? 24 : 12;

// --- DYNAMIC SVG DONUT COMPONENT ---
const DynamicDonut = ({ gotIt, sortOf, lost }) => {
  const size = 160;
  const strokeWidth = 30; // Matches your original border width
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = gotIt + sortOf + lost;

  if (total === 0) {
    return <Circle cx={center} cy={center} r={radius} stroke="#d1d9e6" strokeWidth={strokeWidth} fill="none" />;
  }

  const gotItShare = (gotIt / 100) * circumference;
  const sortOfShare = (sortOf / 100) * circumference;
  const lostShare = (lost / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#4CAF50" strokeWidth={strokeWidth} strokeDasharray={`${gotItShare} ${circumference}`} />
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#FFC107" strokeWidth={strokeWidth} strokeDasharray={`${sortOfShare} ${circumference}`} strokeDashoffset={-gotItShare} />
      <Circle cx={center} cy={center} r={radius} fill="none" stroke="#FF5C5C" strokeWidth={strokeWidth} strokeDasharray={`${lostShare} ${circumference}`} strokeDashoffset={-(gotItShare + sortOfShare)} />
    </Svg>
  );
};

export default function SessionSummary({ session, onRestart, onBack }) {
  const [expandedPulses, setExpandedPulses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // --- DYNAMIC DATA STATES ---
  const [stats, setStats] = useState({ participants: 0, totalResponses: 0, responseRate: 0, questions: 0, pulses: 0 });
  const [overall, setOverall] = useState({ gotIt: 0, sortOf: 0, lost: 0 });
  const [timelineData, setTimelineData] = useState([]);
  const [confusionData, setConfusionData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [questions, setQuestions] = useState([]);

  const displayCode = session?.code || 'ERROR';

  useEffect(() => {
    if (!session?.id) return;
    fetchAnalytics();
  }, [session]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    const { data: doubtsData } = await supabase.from('doubts').select('*').eq('session_id', session.id);
    const { data: pulsesData } = await supabase.from('pulses').select('*').eq('session_id', session.id).order('created_at', { ascending: true });

    const pulseIds = pulsesData?.map(p => p.id) || [];
    let responsesData = [];
    if (pulseIds.length > 0) {
      const { data } = await supabase.from('responses').select('*').in('pulse_id', pulseIds);
      responsesData = data || [];
    }

    processAnalytics(doubtsData || [], pulsesData || [], responsesData);
  };

  const processAnalytics = (doubts, pulses, responses) => {
    const totalResponses = responses.length;
    setQuestions(doubts);

    let maxParticipants = 0;
    const pulseStats = pulses.map((pulse, index) => {
      const pulseResponses = responses.filter(r => r.pulse_id === pulse.id);
      const pulseTotal = pulseResponses.length;
      if (pulseTotal > maxParticipants) maxParticipants = pulseTotal;

      const got = pulseResponses.filter(r => r.status === 'got_it').length;
      const sort = pulseResponses.filter(r => r.status === 'sort_of').length;
      const lost = pulseResponses.filter(r => r.status === 'lost').length;

      return {
        id: pulse.id,
        title: `Topic ${index + 1}`,
        number: index + 1,
        total: pulseTotal,
        got: pulseTotal ? Math.round((got / pulseTotal) * 100) : 0,
        sort: pulseTotal ? Math.round((sort / pulseTotal) * 100) : 0,
        lost: pulseTotal ? Math.round((lost / pulseTotal) * 100) : 0,
      };
    });

    const totalGot = responses.filter(r => r.status === 'got_it').length;
    const totalSort = responses.filter(r => r.status === 'sort_of').length;
    const totalLost = responses.filter(r => r.status === 'lost').length;

    setOverall({
      gotIt: totalResponses ? Math.round((totalGot / totalResponses) * 100) : 0,
      sortOf: totalResponses ? Math.round((totalSort / totalResponses) * 100) : 0,
      lost: totalResponses ? Math.round((totalLost / totalResponses) * 100) : 0,
    });

    const expectedTotalResponses = maxParticipants * pulses.length;
    const avgResponseRate = expectedTotalResponses ? Math.round((totalResponses / expectedTotalResponses) * 100) : 0;

    setStats({
      participants: maxParticipants,
      totalResponses,
      responseRate: avgResponseRate,
      questions: doubts.length,
      pulses: pulses.length
    });

    setTimelineData(pulseStats);

    const sortedConfusion = [...pulseStats].sort((a, b) => b.lost - a.lost).slice(0, 4);
    setConfusionData(sortedConfusion.map(p => ({ id: p.id, title: p.title, width: `${p.lost}%` })));

    setTrendData(pulseStats.map(p => ({
      label: `P${p.number}`,
      val: maxParticipants ? Math.round((p.total / maxParticipants) * 100) : 0
    })));

    setIsLoading(false);
  };

  const togglePulse = (id) => {
    setExpandedPulses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- NEW BUTTON LOGIC ---
  const handleMarkAnswered = async (id) => {
    // 1. Tell Supabase it's answered
    await supabase.from('doubts').update({ is_answered: true }).eq('id', id);
    // 2. Update the UI instantly
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_answered: true } : q));
  };

  const handleSaveForLater = (id) => {
    // Just updates the UI locally to mark it as saved
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_saved: true } : q));
    alert("Question pinned for your next session!");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f8cff" />
        <Text style={{ marginTop: 20, color: '#6b7280', fontWeight: 'bold' }}>Crunching Session Analytics...</Text>
      </SafeAreaView>
    );
  }

  // SECTION 1 — SESSION SUMMARY HEADER
  const renderHeader = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={[styles.cardTitle, { fontSize: 24, marginBottom: 12 }]}>Session Summary</Text>
      <View style={isLargeScreen ? styles.rowWrap : styles.column}>
        <View style={styles.metadataItem}><Text style={styles.secondaryText}>Session Code:</Text><Text style={styles.metadataValue}>{displayCode}</Text></View>
        <View style={styles.metadataItem}><Text style={styles.secondaryText}>Date:</Text><Text style={styles.metadataValue}>{new Date().toLocaleDateString()}</Text></View>
        <View style={styles.metadataItem}><Text style={styles.secondaryText}>Participants:</Text><Text style={styles.metadataValue}>{stats.participants}</Text></View>
        <View style={styles.metadataItem}><Text style={styles.secondaryText}>Pulse Checks:</Text><Text style={styles.metadataValue}>{stats.pulses}</Text></View>
      </View>
    </NeumorphicView>
  );

  // SECTION 2 — OVERALL CLASS UNDERSTANDING
  const renderDonut = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={styles.cardTitle}>Overall Understanding</Text>
      <View style={styles.chartContainer}>
        <NeumorphicView style={styles.donutOuter}>
          {/* DYNAMIC SVG CHART REPLACES CSS BORDERS */}
          <DynamicDonut {...overall} />
          <NeumorphicView style={styles.donutInner}>
            <Text style={styles.donutCenterMetric}>{overall.gotIt}%</Text>
            <Text style={styles.donutCenterLabel}>Got It</Text>
          </NeumorphicView>
        </NeumorphicView>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} /><Text style={styles.cardLabelSmall}>Got It: {overall.gotIt}%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} /><Text style={styles.cardLabelSmall}>Sort Of: {overall.sortOf}%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF5C5C' }]} /><Text style={styles.cardLabelSmall}>Lost: {overall.lost}%</Text></View>
        </View>
      </View>
    </NeumorphicView>
  );

  // SECTION 3 — PULSE CHECK TIMELINE
  const renderTimeline = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={styles.cardTitle}>Pulse Check Timeline</Text>
      {timelineData.length === 0 ? <Text style={styles.secondaryText}>No pulses recorded.</Text> : null}
      <View style={styles.timelineContainer}>
        {timelineData.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={styles.timelineNode}>
              <View style={styles.timelineDot} />
              {index !== timelineData.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <NeumorphicView style={[styles.smallCard, styles.timelineCard, { paddingVertical: expandedPulses[item.id] ? 12 : 10, paddingHorizontal: 16 }]}>
              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedPulses[item.id] ? 12 : 0 }}
                onPress={() => togglePulse(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timelineTitle, { marginBottom: 0, fontSize: 14 }]}>Pulse {item.number} — {item.title}</Text>
                <Ionicons name={expandedPulses[item.id] ? "chevron-up" : "chevron-down"} size={16} color="#6b7280" />
              </TouchableOpacity>

              {expandedPulses[item.id] && (
                <View style={styles.timelineMetrics}>
                  <View style={styles.timelineMetricBox}><Text style={[styles.metricNumberTimeline, { color: '#4CAF50' }]}>{item.got}%</Text><Text style={styles.timelineSecondaryText}>Got It</Text></View>
                  <View style={styles.timelineMetricBox}><Text style={[styles.metricNumberTimeline, { color: '#FFC107' }]}>{item.sort}%</Text><Text style={styles.timelineSecondaryText}>Sort Of</Text></View>
                  <View style={styles.timelineMetricBox}><Text style={[styles.metricNumberTimeline, { color: '#FF5C5C' }]}>{item.lost}%</Text><Text style={styles.timelineSecondaryText}>Lost</Text></View>
                </View>
              )}
            </NeumorphicView>
          </View>
        ))}
      </View>
    </NeumorphicView>
  );

  // SECTION 4 — TOPIC CONFUSION HEATMAP
  const renderHeatmap = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={styles.cardTitle}>Topic Confusion Levels</Text>
      <Text style={[styles.secondaryText, { marginBottom: 20 }]}>Higher bars indicate more students selecting "Lost".</Text>
      {confusionData.length === 0 ? <Text style={styles.secondaryText}>No confusion data available.</Text> : null}

      {confusionData.map(item => (
        <View key={item.id} style={styles.heatmapRow}>
          <Text style={styles.heatmapLabel} numberOfLines={1}>{item.title}</Text>
          <View style={styles.heatmapTrackContainer}>
            <NeumorphicView inset={true} style={styles.heatmapTrack}>
              <View style={[styles.heatmapFill, { width: item.width }]} />
            </NeumorphicView>
          </View>
        </View>
      ))}
    </NeumorphicView>
  );

  // SECTION 5 — ENGAGEMENT STATISTICS
  const renderStats = () => (
    <View style={isLargeScreen ? styles.rowWrap : styles.column}>
      <NeumorphicView style={[styles.smallCard, styles.flex1, { marginHorizontal: isLargeScreen ? 6 : 0 }]}>
        <View style={styles.centerContent}><Text style={styles.metricNumber}>{stats.participants}</Text><Text style={styles.cardLabelSmall}>Total Students Joined</Text></View>
      </NeumorphicView>
      <NeumorphicView style={[styles.smallCard, styles.flex1, { marginHorizontal: isLargeScreen ? 6 : 0 }]}>
        <View style={styles.centerContent}><Text style={styles.metricNumber}>{stats.totalResponses}</Text><Text style={styles.cardLabelSmall}>Total Responses</Text></View>
      </NeumorphicView>
      <NeumorphicView style={[styles.smallCard, styles.flex1, { marginHorizontal: isLargeScreen ? 6 : 0 }]}>
        <View style={styles.centerContent}><Text style={styles.metricNumber}>{stats.responseRate}%</Text><Text style={styles.cardLabelSmall}>Average Response Rate</Text></View>
      </NeumorphicView>
      <NeumorphicView style={[styles.smallCard, styles.flex1, { marginHorizontal: isLargeScreen ? 6 : 0 }]}>
        <View style={styles.centerContent}><Text style={styles.metricNumber}>{stats.questions}</Text><Text style={styles.cardLabelSmall}>Questions Asked</Text></View>
      </NeumorphicView>
    </View>
  );

  // SECTION 6 — PARTICIPATION TREND
  const renderParticipation = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={styles.cardTitle}>Student Participation Over Time</Text>
      <Text style={[styles.secondaryText, { marginBottom: 8 }]}>Percentage of connected students responding to pulses.</Text>
      {trendData.length === 0 ? <Text style={styles.secondaryText}>Not enough data to map trends.</Text> : null}

      <View style={styles.barChartContainer}>
        {trendData.map((item, idx) => (
          <View key={idx} style={styles.barColumn}>
            <Text style={styles.barValueText}>{item.val}%</Text>
            <NeumorphicView inset={true} style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${item.val}%` }]} />
            </NeumorphicView>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </NeumorphicView>
  );

  // SECTION 7 — ANONYMOUS QUESTIONS SUMMARY
  const renderQuestions = () => (
    <NeumorphicView style={[styles.card, { padding: cardPadding }]}>
      <Text style={styles.cardTitle}>Anonymous Questions</Text>
      <View style={styles.questionsContainer}>
        {questions.length === 0 ? <Text style={styles.secondaryText}>No questions were asked.</Text> : null}
        {questions.map((q) => (
          <NeumorphicView key={q.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4f8cff" style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.questionText}>"{q.content}"</Text>
            </View>
            <View style={styles.questionActions}>
              <TouchableOpacity disabled={q.is_answered} onPress={() => handleMarkAnswered(q.id)}>
                <NeumorphicView style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>{q.is_answered ? "Answered Live" : "Mark Answered"}</Text>
                </NeumorphicView>
              </TouchableOpacity>

              <TouchableOpacity disabled={q.is_saved} onPress={() => handleSaveForLater(q.id)}>
                <NeumorphicView style={styles.actionButtonSecondary}>
                  <Text style={styles.actionButtonTextSecondary}>{q.is_saved ? "Saved ✓" : "Save for Next Class"}</Text>
                </NeumorphicView>
              </TouchableOpacity>
            </View>
          </NeumorphicView>
        ))}
      </View>
    </NeumorphicView>
  );

  // SECTION 8 — KEY INSIGHTS PANEL (Now Dynamic!)
  const renderInsights = () => {
    // Dynamically calculate insights based on the real data
    const highestConfusionPulse = timelineData.length > 0
      ? [...timelineData].sort((a, b) => b.lost - a.lost)[0]
      : null;

    const insight1 = highestConfusionPulse
      ? `Highest confusion occurred during Pulse ${highestConfusionPulse.number}.`
      : "No pulse checks were run during this session.";

    const insight2 = overall.gotIt >= 70
      ? `Great job! ${overall.gotIt}% of the class understood the core material.`
      : `Class struggled slightly. Only ${overall.gotIt}% fully understood.`;

    const insight3 = stats.responseRate > 80
      ? "Student engagement was outstandingly high today!"
      : `Engagement was at ${stats.responseRate}%. Try running more pulses.`;

    const insight4 = `${stats.questions} anonymous doubts were submitted by students.`;

    return (
      <NeumorphicView style={[styles.card, { padding: cardPadding }]} isGlow={true} glowColor="#4f8cff">
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="sparkles" size={24} color="#4f8cff" style={{ marginRight: 10 }} />
          <Text style={styles.cardTitle}>Key Insights</Text>
        </View>

        <View style={styles.insightBullet}><Ionicons name="ellipse" size={8} color="#FF5C5C" style={styles.bulletIcon} /><Text style={styles.insightText}>{insight1}</Text></View>
        <View style={styles.insightBullet}><Ionicons name="ellipse" size={8} color="#4CAF50" style={styles.bulletIcon} /><Text style={styles.insightText}>{insight2}</Text></View>
        <View style={styles.insightBullet}><Ionicons name="ellipse" size={8} color="#FFC107" style={styles.bulletIcon} /><Text style={styles.insightText}>{insight3}</Text></View>
        <View style={styles.insightBullet}><Ionicons name="ellipse" size={8} color="#4f8cff" style={styles.bulletIcon} /><Text style={styles.insightText}>{insight4}</Text></View>
      </NeumorphicView>
    );
  };

  // SECTION 9 — EXPORT AND ACTION BUTTONS
  const renderActions = () => (
    <View style={[isLargeScreen ? styles.rowWrap : styles.column, { gap: 12 }]}>
      <TouchableOpacity style={isLargeScreen ? { flex: 1 } : { width: '100%' }}>
        <NeumorphicView style={styles.actionMainButton}>
          <Ionicons name="download-outline" size={20} color="#4f8cff" style={{ marginRight: 8 }} />
          <Text style={styles.actionMainText}>Download PDF</Text>
        </NeumorphicView>
      </TouchableOpacity>
      <TouchableOpacity style={isLargeScreen ? { flex: 1 } : { width: '100%' }}>
        <NeumorphicView style={styles.actionMainButton}>
          <Ionicons name="share-outline" size={20} color="#2f3542" style={{ marginRight: 8 }} />
          <Text style={styles.actionMainTextDark}>Share Summary</Text>
        </NeumorphicView>
      </TouchableOpacity>
      <TouchableOpacity style={isLargeScreen ? { flex: 1 } : { width: '100%' }} onPress={onRestart}>
        <NeumorphicView style={[styles.actionMainButton, { backgroundColor: '#4f8cff' }]} isGlow={true} glowColor="#4f8cff">
          <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={[styles.actionMainText, { color: '#ffffff' }]}>New Session</Text>
        </NeumorphicView>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── SKY-BLUE HEADER ── */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse" size={24} color="#fff" />
          <Text style={styles.headerAppName}>ClassPulse</Text>
        </View>

        <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
          <View style={styles.backPill}>
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backPillText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidthContainer}>

          <View style={styles.spacingMedium} />
          {renderHeader()}

          {/* Section Row 2 */}
          <View style={[isLargeScreen ? styles.row : styles.column, styles.spacingTop]}>
            <View style={[isLargeScreen ? { flex: 1, marginRight: cardMargin } : { width: '100%' }]}>{renderDonut()}</View>
            <View style={[isLargeScreen ? { flex: 1.5 } : { width: '100%' }]}>{renderTimeline()}</View>
          </View>

          {/* Spacer Section */}
          <View style={styles.spacingTop}>{renderHeatmap()}</View>
          <View style={styles.spacingTop}>{renderStats()}</View>

          <View style={[isLargeScreen ? styles.row : styles.column, styles.spacingTop]}>
            <View style={[isLargeScreen ? { flex: 1, marginRight: cardMargin } : { width: '100%' }]}>{renderParticipation()}</View>
            <View style={[isLargeScreen ? { flex: 1.5 } : { width: '100%' }]}>{renderInsights()}</View>
          </View>

          <View style={styles.spacingTop}>{renderQuestions()}</View>
          <View style={styles.spacingTop}>{renderActions()}</View>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// STYLES 100% UNTOUCHED (Copied exactly from your code)
const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12,
    paddingBottom: 14,
    backgroundColor: '#0ea5e9',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerAppName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, letterSpacing: 0.5 },
  headerPageTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  backPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backPillText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },

  safeArea: { flex: 1, backgroundColor: '#e0e5ec' },
  scrollContainer: { padding: Platform.OS === 'web' ? 40 : 16, alignItems: 'center', backgroundColor: '#e0e5ec', minHeight: '100%' },
  maxWidthContainer: { width: '100%', maxWidth: 1200 },
  card: { borderRadius: 24, marginBottom: isLargeScreen ? 24 : 16 },
  smallCard: { borderRadius: 20, padding: 16, marginBottom: isLargeScreen ? 24 : 16 },
  cardTitle: { fontSize: isLargeScreen ? 20 : 18, fontWeight: 'bold', color: '#2f3542', marginBottom: 16, textAlign: isLargeScreen ? 'left' : 'center' },
  secondaryText: { fontSize: 14, color: '#6b7280' },
  row: { flexDirection: 'row' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  flex1: { flex: 1 },
  spacingTop: { marginTop: 0 },
  spacingMedium: { height: 16 },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  metricNumber: { fontSize: 36, fontWeight: 'bold', color: '#2f3542', marginVertical: 4, textAlign: 'center' },
  metricNumberSmall: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  cardLabelSmall: { fontSize: 14, fontWeight: '600', color: '#2f3542', textAlign: 'center' },

  metadataItem: { flexDirection: isLargeScreen ? 'column' : 'row', justifyContent: isLargeScreen ? 'flex-start' : 'space-between', flex: 1, marginVertical: 4 },
  metadataValue: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginTop: isLargeScreen ? 2 : 0 },

  chartContainer: { alignItems: 'center', marginVertical: 8 },
  donutOuter: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e5ec', zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  donutCenterMetric: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  donutCenterLabel: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  legendContainer: { flexDirection: 'row', marginTop: 16, justifyContent: 'center', width: '100%', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },

  timelineContainer: { marginTop: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineNode: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4f8cff', marginTop: 14 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#d1d9e6', marginVertical: 4 },
  timelineCard: { flex: 1, marginLeft: 12, marginBottom: 12 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 16 },
  timelineMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineMetricBox: { alignItems: 'center' },
  metricNumberTimeline: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  timelineSecondaryText: { fontSize: 12, color: '#6b7280' },

  heatmapRow: { flexDirection: isLargeScreen ? 'row' : 'column', alignItems: isLargeScreen ? 'center' : 'flex-start', marginBottom: 16 },
  heatmapLabel: { width: isLargeScreen ? 160 : '100%', fontSize: 14, fontWeight: '600', color: '#2f3542', marginBottom: isLargeScreen ? 0 : 8 },
  heatmapTrackContainer: { flex: 1, width: '100%', height: 24 },
  heatmapTrack: { flex: 1, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#e0e5ec' },
  heatmapFill: { height: 24, borderRadius: 12, backgroundColor: '#FF5C5C' },

  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 150, marginTop: 8, paddingBottom: 8 },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: { width: 24, height: 100, borderRadius: 12, justifyContent: 'flex-end', marginVertical: 6, padding: 4 },
  barFill: { width: 16, borderRadius: 8, backgroundColor: '#4f8cff' },
  barValueText: { fontSize: 11, fontWeight: 'bold', color: '#4f8cff' },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#2f3542' },

  questionsContainer: { marginTop: 8 },
  questionCard: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'column' },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingRight: 8 },
  questionText: { fontSize: 14, color: '#2f3542', fontStyle: 'italic', flex: 1, lineHeight: 20 },
  questionActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingLeft: 28 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  actionButtonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 12 },
  actionButtonSecondary: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionButtonTextSecondary: { color: '#6b7280', fontWeight: 'bold', fontSize: 12 },

  insightBullet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  bulletIcon: { marginTop: 6, marginRight: 12 },
  insightText: { fontSize: 16, color: '#2f3542', flex: 1, lineHeight: 24 },

  actionMainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  actionMainText: { fontSize: 14, fontWeight: 'bold', color: '#4f8cff' },
  actionMainTextDark: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
});