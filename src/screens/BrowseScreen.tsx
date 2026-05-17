import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { ClubCard } from '@/components/ClubCard';
import { clubs } from '@/data/sampleClubs';
import { colors } from '@/theme/tokens';
export function BrowseScreen({navigation}:any){const [q,setQ]=useState(''); const data=useMemo(()=>clubs.filter(c=>[c.name,c.category,c.advisor,c.meetingDay,...c.interests,...c.grades].join(' ').toLowerCase().includes(q.toLowerCase())),[q]); return <View style={styles.container}><BrandHeader/><TextInput placeholder="Search by club, category, day, advisor, grade, or interest" placeholderTextColor={colors.muted} value={q} onChangeText={setQ} style={styles.search}/><FlatList contentContainerStyle={styles.list} data={data} keyExtractor={i=>i.id} renderItem={({item})=><ClubCard club={item} onPress={()=>navigation.navigate('ClubProfile',{clubId:item.id})}/>}/></View>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.bg},search:{margin:16,marginTop:0,padding:14,borderRadius:16,backgroundColor:colors.surface2,color:colors.text,borderWidth:1,borderColor:colors.border},list:{paddingHorizontal:16,paddingBottom:32}})
