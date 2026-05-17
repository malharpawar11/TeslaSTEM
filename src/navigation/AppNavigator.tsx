import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BrowseScreen } from '@/screens/BrowseScreen';
import { ClubProfileScreen } from '@/screens/ClubProfileScreen';
import { AdminScreen } from '@/screens/AdminScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { colors } from '@/theme/tokens';
const Stack=createNativeStackNavigator(); const Tabs=createBottomTabNavigator();
function HomeTabs(){return <Tabs.Navigator screenOptions={({route})=>({headerShown:false,tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border},tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.muted,tabBarIcon:({color,size})=><Ionicons name={route.name==='Browse'?'search':route.name==='Admin'?'shield-checkmark':'document-text'} color={color} size={size}/>})}><Tabs.Screen name="Browse" component={BrowseScreen}/><Tabs.Screen name="Admin" component={AdminScreen}/><Tabs.Screen name="Policies" component={PoliciesScreen}/></Tabs.Navigator>}
export function AppNavigator(){return <NavigationContainer theme={{...DefaultTheme,colors:{...DefaultTheme.colors,background:colors.bg,text:colors.text,primary:colors.primary,card:colors.surface,border:colors.border}}}><Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,headerTitleStyle:{fontWeight:'900'}}}><Stack.Screen name="Tesla STEM Clubs" component={HomeTabs} options={{headerShown:false}}/><Stack.Screen name="ClubProfile" component={ClubProfileScreen} options={{title:'Club Profile'}}/></Stack.Navigator></NavigationContainer>}
