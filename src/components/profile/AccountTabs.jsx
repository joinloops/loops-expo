import { XStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

function GridIconWithChevron({ isActive, showMenu }) {
    const color = isActive ? '#161823' : '#bbb';
    
    return (
        <View style={tw`flex-row items-center gap-1`}>
            <View style={tw`gap-[3px]`}>
                <View style={tw`flex-row gap-[6px]`}>
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                </View>
                <View style={tw`flex-row gap-[6px]`}>
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                    <View style={[tw`w-[2px] h-[10px] rounded-[1px]`, { backgroundColor: color }]} />
                </View>
            </View>
            
            <Ionicons 
                name={showMenu ? "chevron-up" : "chevron-down"} 
                size={12} 
                color={color} 
            />
        </View>
    );
}

export default function AccountTabs({ activeTab, onTabChange, isOwner = false, sortBy = 'latest', onSortChange }) {
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
    const videosTabRef = useRef(null);
    const mounted = useRef(true);

    useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);
    
    const tabs = [
        { id: 'videos', icon: 'apps-sharp', iconActive: 'apps-sharp', customIcon: true },
    ];
    
    if(isOwner) {
        tabs.push(
            { id: 'favorites', icon: 'bookmark-outline', iconActive: 'bookmark-outline' },
            { id: 'likes', icon: 'heart-outline', iconActive: 'heart-outline' }
        );
    }

    const handleVideosTabPress = () => {
        const screenWidth = Dimensions.get('window').width;
        const dropdownWidth = 160;
        
        videosTabRef.current?.measure((x, y, width, height, pageX, pageY) => {
            if (!mounted.current) {
                return;
            }
            const centeredX = pageX + (width / 2) - (dropdownWidth / 2);
            setDropdownPosition({ x: centeredX, y: pageY + height });
            setShowSortMenu(true);
        });
    };

    const handleSortSelect = (sort) => {
        onSortChange?.(sort);
        setShowSortMenu(false);
    };

    return (
        <>
            <View style={tw`border-b-2 border-gray-200`}>
                <XStack justifyContent="space-around" alignItems="center" paddingX="$3" bg="white">
                    {tabs.map((tab) => (
                        <Pressable
                            key={tab.id}
                            ref={tab.id === 'videos' ? videosTabRef : null}
                            onPress={() => {
                                if (activeTab == 'videos' && tab.id === 'videos') {
                                    handleVideosTabPress();
                                } else {
                                    onTabChange(tab.id);
                                }
                            }}
                            collapsable={false} 
                            accessibilityLabel={`${tab.id} tab`}
                            accessibilityState={{
                                selected: (activeTab === tab.id)
                            }}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                paddingVertical: 8,
                            }}>
                            {tab.customIcon ? (
                                <GridIconWithChevron 
                                    isActive={activeTab === tab.id} 
                                    showMenu={showSortMenu && tab.id === 'videos'}
                                />
                            ) : (
                                <Ionicons
                                    name={activeTab === tab.id ? tab.iconActive : tab.icon}
                                    size={24}
                                    color={activeTab === tab.id ? '#161823' : '#bbb'}
                                />
                            )}
                        </Pressable>
                    ))}
                </XStack>
            </View>

            <Modal
                visible={showSortMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSortMenu(false)}
            >
                <Pressable 
                    style={tw`flex-1`}
                    onPress={() => setShowSortMenu(false)}
                >
                    <View 
                        style={[
                            tw`absolute bg-[#2F2F2F] rounded-lg overflow-hidden min-w-40`,
                            { 
                                left: dropdownPosition.x,
                                top: dropdownPosition.y + 8
                            }
                        ]}
                    >
                        <Pressable
                            onPress={() => handleSortSelect('Latest')}
                            style={tw`flex-row items-center justify-between px-4 py-3`}
                        >
                            <Text style={tw`text-white text-base`}>Latest</Text>
                            {sortBy === 'Latest' && (
                                <Ionicons name="checkmark" size={20} color="white" />
                            )}
                        </Pressable>
                        
                        <View style={tw`h-[0.5px] bg-gray-600 mx-2`} />
                        
                        <Pressable
                            onPress={() => handleSortSelect('Popular')}
                            style={tw`flex-row items-center justify-between px-4 py-3`}
                        >
                            <Text style={tw`text-white text-base`}>Popular</Text>
                            {sortBy === 'Popular' && (
                                <Ionicons name="checkmark" size={20} color="white" />
                            )}
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}