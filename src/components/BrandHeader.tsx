import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';
export function BrandHeader() { return <View style={styles.wrap}><Image source={require('../../teslastemlogo.png')} style={styles.logo}/><View><Text style={styles.kicker}>TESLA STEM PYTHONS</Text><Text style={styles.title}>Club Directory</Text></View></View>; }
const styles=StyleSheet.create({wrap:{flexDirection:'row',alignItems:'center',gap:12,padding:16,backgroundColor:colors.bg},logo:{width:46,height:46,borderRadius:10},kicker:{color:colors.primary,fontSize:12,fontWeight:'800',letterSpacing:1.5},title:{color:colors.text,fontSize:24,fontWeight:'800'}});
