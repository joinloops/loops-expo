import { XStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import tw from 'twrnc';

export default function AccountTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'videos', icon: 'film', iconActive: 'film' },
        // { id: 'favorites', icon: 'heart-outline', iconActive: 'heart' },
        // { id: 'reblogs', icon: 'sync-outline', iconActive: 'sync' },
    ];

    return (
        <View style={tw`border-b-2 border-gray-200 mb-1`}>
            <XStack justifyContent="space-around" alignItems="center" paddingX="$3" bg="white">
                {tabs.map((tab) => (
                    <Pressable
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: 8,
                            // borderBottomWidth: activeTab === tab.id ? 2 : 0,
                            // borderBottomColor: '#161823',
                        }}>
                        <Ionicons
                            name={activeTab === tab.id ? tab.iconActive : tab.icon}
                            size={24}
                            //color={activeTab === tab.id ? '#161823' : '#86878B'}
                            color={activeTab === tab.id ? '#86878B' : '#86878B'}
                        />
                    </Pressable>
                ))}
            </XStack>
        </View>
    );
}
