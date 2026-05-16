// src/navigation/AppNavigator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Clock3, Users, UserRound, MapPin, LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { THEME } from '../theme';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FriendDetailScreen } from '../screens/FriendDetailScreen';

const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabIcon = ({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) => (
  <View style={[s.tabIcon, focused && s.tabIconActive]}>
    <Icon
      size={20}
      strokeWidth={1.75}
      color={focused ? THEME.color.ember : THEME.color.fg2}
    />
  </View>
);

const MainTabs = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: THEME.color.cream },
        headerTintColor: THEME.color.ink,
        headerTitleStyle: { fontFamily: THEME.font.bodyBold, fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: THEME.color.paper,
          borderTopColor: THEME.color.sandSoft,
          height: 78,
          paddingTop: 8,
          paddingBottom: 20,
        },
        tabBarActiveTintColor: THEME.color.ember,
        tabBarInactiveTintColor: THEME.color.fg2,
        tabBarLabelStyle: {
          fontFamily: THEME.font.bodySemibold,
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home" component={HomeScreen}
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={Clock3} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map" component={MapScreen}
        options={{
          title: t('tabs.map'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={MapPin} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Friends" component={FriendsScreen}
        options={{
          title: t('tabs.friends'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={Users} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile" component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon Icon={UserRound} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="FriendDetail"
            component={FriendDetailScreen}
            options={{
              headerShown: true,
              headerTitle: '',
              headerBackTitle: t('common.back'),
              headerStyle: { backgroundColor: THEME.color.cream },
              headerTintColor: THEME.color.ember,
              headerShadowVisible: false,
            }}
          />
        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

const s = StyleSheet.create({
  tabIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconActive: { backgroundColor: THEME.color.emberSoft },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: THEME.color.cream,
  },
  loadingText: {
    color: THEME.color.fg2,
    fontSize: 16,
    fontFamily: THEME.font.body,
  },
});
