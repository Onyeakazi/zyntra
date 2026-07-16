import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  DeviceEventEmitter,
  Share,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { auth } from '../config/firebase';
import ScreenWrapper from '../components/ScreenWrapper';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { scale, verticalScale } from '../utils/scale';

export default function PrivacyScreen() {
  const { t } = useTranslation();

  // Privacy States (saved in AsyncStorage)
  const [activeStatus, setActiveStatus] = useState(true);
  const [profileSearchable, setProfileSearchable] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const statusVal = await AsyncStorage.getItem('privacy_active_status');
        const searchVal = await AsyncStorage.getItem('privacy_profile_searchable');
        const readVal = await AsyncStorage.getItem('privacy_read_receipts');
        const privateVal = await AsyncStorage.getItem('privacy_private_profile');

        if (statusVal !== null) setActiveStatus(statusVal === 'true');
        if (searchVal !== null) setProfileSearchable(searchVal === 'true');
        if (readVal !== null) setReadReceipts(readVal === 'true');
        if (privateVal !== null) setPrivateProfile(privateVal === 'true');
      } catch (err) {
        console.error("Error loading privacy options:", err);
      }
    };
    loadPrivacySettings();
  }, []);

  // Setters to save values dynamically
  const toggleActiveStatus = async (val) => {
    setActiveStatus(val);
    await AsyncStorage.setItem('privacy_active_status', String(val));
    DeviceEventEmitter.emit('privacy_settings_changed');
  };

  const toggleSearchable = async (val) => {
    setProfileSearchable(val);
    await AsyncStorage.setItem('privacy_profile_searchable', String(val));
    DeviceEventEmitter.emit('privacy_settings_changed');

    // Sync is_searchable status to Supabase database
    try {
      const user = auth.currentUser;
      if (user) {
        const { error } = await supabase
          .from("users")
          .update({ is_searchable: val })
          .eq("id", user.uid);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error syncing is_searchable value to database:", err);
    }
  };

  const toggleReadReceipts = async (val) => {
    setReadReceipts(val);
    await AsyncStorage.setItem('privacy_read_receipts', String(val));
    DeviceEventEmitter.emit('privacy_settings_changed');
  };

  const togglePrivateProfile = async (val) => {
    setPrivateProfile(val);
    await AsyncStorage.setItem('privacy_private_profile', String(val));
    DeviceEventEmitter.emit('privacy_settings_changed');

    // Sync is_private status to Supabase database
    try {
      const user = auth.currentUser;
      if (user) {
        const { error } = await supabase
          .from("users")
          .update({ is_private: val })
          .eq("id", user.uid);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error syncing is_private value to database:", err);
    }
  };

  // Helper translations based on t() active selector
  const getLocalizedTitle = (key) => {
    const lang = t('settings.selectLanguage');
    if (key === 'title') {
      return lang === 'Seleccionar Idioma' ? 'Privacidad' : lang === 'Choisir la langue' ? 'Confidentialité' : lang === 'Definir idioma' ? 'Privacidade' : 'Privacy';
    }
    if (key === 'accountVisibility') {
      return lang === 'Seleccionar Idioma' ? 'Visibilidad de la cuenta' : lang === 'Choisir la langue' ? 'Visibilité du compte' : lang === 'Definir idioma' ? 'Visibilidade da conta' : 'Account Visibility';
    }
    if (key === 'chatAndOnline') {
      return lang === 'Seleccionar Idioma' ? 'Chat y En línea' : lang === 'Choisir la langue' ? 'Chat & En ligne' : lang === 'Definir idioma' ? 'Chat & Online' : 'Chat & Online';
    }
    if (key === 'dataPrivacy') {
      return lang === 'Seleccionar Idioma' ? 'Privacidad de datos' : lang === 'Choisir la langue' ? 'Confidentialité des données' : lang === 'Definir idioma' ? 'Privacidade dos dados' : 'Data Privacy';
    }
  };

  const getLocalizedLabels = (key) => {
    const lang = t('settings.selectLanguage');
    switch (key) {
      case 'privateProfile':
        return lang === 'Seleccionar Idioma' ? 'Cuenta Privada' : lang === 'Choisir la langue' ? 'Compte privé' : lang === 'Definir idioma' ? 'Conta Privada' : 'Private Profile';
      case 'privateProfileDesc':
        return lang === 'Seleccionar Idioma' ? 'Solo las conexiones aceptadas pueden ver tu perfil y publicaciones.' : lang === 'Choisir la langue' ? 'Seules vos connexions acceptées peuvent voir votre profil et vos publications.' : lang === 'Definir idioma' ? 'Apenas conexões aceitas podem ver seu perfil e postagens.' : 'Only accepted connections can view your profile and posts.';
      case 'activeStatus':
        return lang === 'Seleccionar Idioma' ? 'Mostrar estado activo' : lang === 'Choisir la langue' ? 'Afficher le statut en ligne' : lang === 'Definir idioma' ? 'Mostrar status online' : 'Show Active Status';
      case 'activeStatusDesc':
        return lang === 'Seleccionar Idioma' ? 'Permite que otros vean cuando estás en línea en el chat.' : lang === 'Choisir la langue' ? 'Permet aux autres de voir quand vous êtes en ligne dans le chat.' : lang === 'Definir idioma' ? 'Permite que outros vejam quando você está online no chat.' : 'Allows others to see when you are online in chat.';
      case 'readReceipts':
        return lang === 'Seleccionar Idioma' ? 'Confirmaciones de lectura' : lang === 'Choisir la langue' ? 'Confirmations de lecture' : lang === 'Definir idioma' ? 'Confirmações de leitura' : 'Send Read Receipts';
      case 'readReceiptsDesc':
        return lang === 'Seleccionar Idioma' ? 'Muestra confirmaciones de lectura (vistos) en las conversaciones.' : lang === 'Choisir la langue' ? 'Affiche des confirmations de lecture (vus) dans les conversations.' : lang === 'Definir idioma' ? 'Mostra confirmações de leitura (vistos) nas conversas.' : 'Shows read checkmarks inside chat conversations.';
      case 'searchable':
        return lang === 'Seleccionar Idioma' ? 'Permitir búsqueda global' : lang === 'Choisir la langue' ? 'Autoriser la recherche globale' : lang === 'Definir idioma' ? 'Permitir busca global' : 'Allow Global Search';
      case 'searchableDesc':
        return lang === 'Seleccionar Idioma' ? 'Tu perfil aparecerá en búsquedas globales en Zyntra.' : lang === 'Choisir la langue' ? 'Votre profil apparaîtra dans les recherches globales sur Zyntra.' : lang === 'Definir idioma' ? 'Seu perfil aparecerá nas buscas globais no Zyntra.' : 'Your profile will appear in global search results across Zyntra.';
      case 'downloadData':
        return lang === 'Seleccionar Idioma' ? 'Descargar mi información' : lang === 'Choisir la langue' ? 'Télécharger mes données' : lang === 'Definir idioma' ? 'Baixar minhas informações' : 'Download My Data';
      case 'downloadDataDesc':
        return lang === 'Seleccionar Idioma' ? 'Obtén una copia de tu historial de publicaciones y fotos.' : lang === 'Choisir la langue' ? 'Obtenez une copie de votre historique de publications et de photos.' : lang === 'Definir idioma' ? 'Obtenha uma cópia do seu histórico de postagens e fotos.' : 'Get a copy of your timeline posts and photos history.';
      default: return '';
    }
  };

  const handleDownloadData = () => {
    const lang = t('settings.selectLanguage');
    
    let alertTitle = "Download Data Archive";
    let alertMsg = "Would you like to compile and export your Zyntra account data as a document?";
    let cancelText = "Cancel";
    let confirmText = "Download";

    if (lang === 'Seleccionar Idioma') {
      alertTitle = "Descargar archivo de datos";
      alertMsg = "¿Desea compilar y exportar los datos de su cuenta de Zyntra como un documento?";
      cancelText = "Cancelar";
      confirmText = "Descargar";
    } else if (lang === 'Choisir la langue') {
      alertTitle = "Télécharger l'archive de données";
      alertMsg = "Souhaitez-vous compiler et exporter les données de votre compte Zyntra sous forme de document ?";
      cancelText = "Annuler";
      confirmText = "Télécharger";
    } else if (lang === 'Definir idioma') {
      alertTitle = "Baixar arquivo de dados";
      alertMsg = "Deseja compilar e exportar os dados da sua conta Zyntra como um documento?";
      cancelText = "Cancelar";
      confirmText = "Baixar";
    }

    Alert.alert(
      alertTitle,
      alertMsg,
      [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, onPress: startCompilationAndSharing }
      ]
    );
  };

  const startCompilationAndSharing = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch Profile info from Supabase users table
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.uid)
        .single();
      if (profileErr) throw profileErr;

      // 2. Fetch Posts created by the user
      const { data: posts, error: postsErr } = await supabase
        .from('posts')
        .select('content, created_at, media_url')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });

      // 3. Fetch Connections
      const { data: connections, error: connErr } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id.eq.${user.uid},friend_id.eq.${user.uid}`);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          email: profile.email,
          bio: profile.bio,
          phone: profile.phone,
          education: profile.education,
          work: profile.work,
          address: profile.address,
          created_at: profile.created_at,
        },
        connections_summary: {
          total_connections: connections ? connections.filter(c => c.status === 'accepted').length : 0,
          pending_requests: connections ? connections.filter(c => c.status === 'pending').length : 0,
        },
        posts: (posts || []).map(p => ({
          content: p.content || "",
          created_at: p.created_at,
          has_media: !!p.media_url,
        })),
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const fileUri = FileSystem.documentDirectory + "zyntra_data_export.json";
      
      // Write file locally
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });
      
      // Share as document
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Zyntra Data Export',
          UTI: 'public.json'
        });
      } else {
        // Fallback to basic react-native Share
        await Share.share({
          message: jsonStr,
          title: "Zyntra Data Export",
        });
      }

    } catch (err) {
      console.error("Error exporting user data:", err);
      const lang = t('settings.selectLanguage');
      let title = "Export Error";
      let msg = "We could not compile your data at this time. Please check your connection and try again.";
      if (lang === 'Seleccionar Idioma') {
        title = "Error de exportación";
        msg = "No pudimos compilar sus datos en este momento. Verifique su conexión e intente nuevamente.";
      } else if (lang === 'Choisir la langue') {
        title = "Erreur d'exportation";
        msg = "Nous n'avons pas pu compiler vos données pour le moment. Veuillez vérifier votre connexion.";
      } else if (lang === 'Definir idioma') {
        title = "Erro de exportação";
        msg = "Não foi possível compilar seus dados no momento. Verifique sua conexão e tente novamente.";
      }
      Alert.alert(title, msg);
    }
  };

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getLocalizedTitle('title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ACCOUNT VISIBILITY SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('accountVisibility')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="eye-off-outline" size={20} color="#438def" />
                <View style={styles.textContainer}>
                  <Text style={styles.rowLabel}>{getLocalizedLabels('privateProfile')}</Text>
                  <Text style={styles.rowDescription}>{getLocalizedLabels('privateProfileDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={privateProfile}
                onValueChange={togglePrivateProfile}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={privateProfile ? '#438def' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* CHAT AND ONLINE STATUS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('chatAndOnline')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="ellipse-outline" size={20} color="#10B981" />
                <View style={styles.textContainer}>
                  <Text style={styles.rowLabel}>{getLocalizedLabels('activeStatus')}</Text>
                  <Text style={styles.rowDescription}>{getLocalizedLabels('activeStatusDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={activeStatus}
                onValueChange={toggleActiveStatus}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={activeStatus ? '#438def' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="checkmark-done-outline" size={20} color="#438def" />
                <View style={styles.textContainer}>
                  <Text style={styles.rowLabel}>{getLocalizedLabels('readReceipts')}</Text>
                  <Text style={styles.rowDescription}>{getLocalizedLabels('readReceiptsDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={readReceipts}
                onValueChange={toggleReadReceipts}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={readReceipts ? '#438def' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* DATA PRIVACY SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('dataPrivacy')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="search-outline" size={20} color="#438def" />
                <View style={styles.textContainer}>
                  <Text style={styles.rowLabel}>{getLocalizedLabels('searchable')}</Text>
                  <Text style={styles.rowDescription}>{getLocalizedLabels('searchableDesc')}</Text>
                </View>
              </View>
              <Switch 
                value={profileSearchable}
                onValueChange={toggleSearchable}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={profileSearchable ? '#438def' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.clickableRow}
              onPress={handleDownloadData}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="download-outline" size={20} color="#438def" />
                <View style={styles.textContainer}>
                  <Text style={styles.rowLabel}>{getLocalizedLabels('downloadData')}</Text>
                  <Text style={styles.rowDescription}>{getLocalizedLabels('downloadDataDesc')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = createResponsiveStyleSheet({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: TYPOGRAPHY.bold,
    color: '#111111',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  section: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: scale(13),
    fontFamily: TYPOGRAPHY.semiBold,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
    paddingLeft: scale(4),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(15),
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(15),
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    flex: 1,
    paddingRight: scale(10),
  },
  textContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: scale(15),
    fontFamily: TYPOGRAPHY.medium,
    color: '#1F2937',
    marginBottom: verticalScale(2),
  },
  rowDescription: {
    fontSize: scale(12),
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
    lineHeight: scale(16),
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: scale(16),
  },
});
