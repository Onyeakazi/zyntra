import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import { auth } from '../config/firebase';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { scale, verticalScale } from '../utils/scale';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  // Notifications Preferences States
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyLikesComments, setNotifyLikesComments] = useState(true);
  const [notifyConnections, setNotifyConnections] = useState(true);

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const msgPref = await AsyncStorage.getItem('pref_notify_messages');
        const likePref = await AsyncStorage.getItem('pref_notify_likes_comments');
        const connPref = await AsyncStorage.getItem('pref_notify_connections');

        if (msgPref !== null) setNotifyMessages(msgPref === 'true');
        if (likePref !== null) setNotifyLikesComments(likePref === 'true');
        if (connPref !== null) setNotifyConnections(connPref === 'true');
      } catch (err) {
        console.error("Error loading settings preferences:", err);
      }
    };
    loadPreferences();
  }, []);

  // Handlers to toggle switches and save states
  const toggleMessages = async (value) => {
    setNotifyMessages(value);
    await AsyncStorage.setItem('pref_notify_messages', String(value));
  };

  const toggleLikesComments = async (value) => {
    setNotifyLikesComments(value);
    await AsyncStorage.setItem('pref_notify_likes_comments', String(value));
  };

  const toggleConnections = async (value) => {
    setNotifyConnections(value);
    await AsyncStorage.setItem('pref_notify_connections', String(value));
  };

  // Get active language display name
  const getLanguageName = () => {
    const code = (i18n.language || 'en').toLowerCase().split('-')[0];
    switch (code) {
      case 'es': return 'Español 🇪🇸';
      case 'fr': return 'Français 🇫🇷';
      case 'pt': return 'Português 🇵🇹';
      default: return 'English 🇬🇧';
    }
  };

  // Handle legal alert dialogs
  const handleShowAbout = () => {
    const lang = t('settings.selectLanguage');
    let title = "About Zyntra";
    let msg = "Zyntra is a premium professional networking platform designed to build connections, grow careers, and share ideas.\n\n---\nTerms & Conditions:\n1. Acceptable Use: Please be respectful and post content that follows community guidelines.\n2. Safety: Harassment, spam, or abusive behavior are strictly prohibited.\n3. Content: You own your posts but grant Zyntra a license to display them.";
    
    if (lang === 'Seleccionar Idioma') {
      title = "Acerca de Zyntra";
      msg = "Zyntra es una plataforma de redes profesionales de primer nivel diseñada para crear conexiones, hacer crecer carreras e intercambiar ideas.\n\n---\nTérminos y Condiciones:\n1. Uso Aceptable: Sea respetuoso y publique contenido que siga las pautas de la comunidad.\n2. Seguridad: El acoso, el spam o el comportamiento abusivo están estrictamente prohibidos.\n3. Contenido: Usted es dueño de sus publicaciones, pero otorga a Zyntra una licencia para mostrarlas.";
    } else if (lang === 'Choisir la langue') {
      title = "À propos de Zyntra";
      msg = "Zyntra est une plateforme de réseautage professionnel de premier ordre conçue pour créer des liens, développer des carrières et partager des idées.\n\n---\nConditions Générales :\n1. Utilisation acceptable : Veuillez être respectueux et publier du contenu conforme aux règles de la communauté.\n2. Sécurité : Le harcèlement, le spam ou les comportements abusifs sont strictement interdits.\n3. Contenu : Vous êtes propriétaire de vos publications mais accordez à Zyntra le droit de les afficher.";
    } else if (lang === 'Definir idioma') {
      title = "Sobre o Zyntra";
      msg = "O Zyntra é uma plataforma de rede profissional premium projetada para criar conexões, expandir carreiras e compartilhar ideias.\n\n---\nTermos e Condições:\n1. Uso Aceitável: Seja respeitoso e publique conteúdo que siga as diretrizes da comunidade.\n2. Segurança: Assédio, spam ou comportamento abusivo são estritamente proibidos.\n3. Conteúdo: Você possui suas postagens, mas concede ao Zyntra uma licença para exibi-las.";
    }
    Alert.alert(title, msg);
  };

  const handleShowPrivacy = () => {
    const lang = t('settings.selectLanguage');
    let title = "Privacy Policy";
    let message = "Zyntra values your privacy:\n\n1. Information Collection: We collect information you provide (name, email, profile updates).\n2. Information Use: We use your data to power professional networking connections, stories, and feed posts.\n3. Security: We implement standard security procedures to protect your data.";
    
    if (lang === 'Seleccionar Idioma') {
      title = "Política de Privacidad";
      message = "Zyntra valora su privacidad:\n\n1. Recopilación de información: Recopilamos la información que proporciona (nombre, correo electrónico, actualizaciones de perfil).\n2. Uso de la información: Usamos sus datos para impulsar las conexiones profesionales, historias y publicaciones.\n3. Seguridad: Implementamos procedimientos de seguridad estándar para proteger sus datos.";
    } else if (lang === 'Choisir la langue') {
      title = "Politique de Confidentialité";
      message = "Zyntra respecte votre vie privée :\n\n1. Collecte d'informations: Nous collectons les informations que vous fournissez (nom, email, mises à jour de profil).\n2. Utilisation des informations: Nous utilisons vos données pour alimenter les connexions professionnelles, les stories et les publications.\n3. Sécurité: Nous mettons en œuvre des procédures de sécurité standard pour protéger vos données.";
    } else if (lang === 'Definir idioma') {
      title = "Política de Privacidade";
      message = "O Zyntra valoriza sua privacidade:\n\n1. Coleta de Informações: Coletamos informações que você fornece (nome, e-mail, atualizações de perfil).\n2. Uso de Informações: Usamos seus dados para alimentar as conexões de rede profissional, histórias e publicações no feed.\n3. Segurança: Implementamos procedimentos de segurança padrão para proteger seus dados.";
    }
    Alert.alert(title, message);
  };

  const handleDeactivate = () => {
    const lang = t('settings.selectLanguage');
    let title = "Deactivate Account";
    let message = "Are you sure you want to deactivate your Zyntra account? This action is temporary and you can re-activate by logging in again.";
    let cancelText = "Cancel";
    let confirmText = "Deactivate";

    if (lang === 'Seleccionar Idioma') {
      title = "Desactivar Cuenta";
      message = "¿Está seguro de que desea desactivar su cuenta de Zyntra? Esta acción es temporal y puede reactivarla iniciando sesión nuevamente.";
      cancelText = "Cancelar";
      confirmText = "Desactivar";
    } else if (lang === 'Choisir la langue') {
      title = "Désactiver le compte";
      message = "Êtes-vous sûr de vouloir désactiver votre compte Zyntra ? Cette action est temporaire et vous pouvez le réactiver en vous reconnectant.";
      cancelText = "Annuler";
      confirmText = "Désactiver";
    } else if (lang === 'Definir idioma') {
      title = "Desativar Conta";
      message = "Tem certeza de que deseja desativar sua conta Zyntra? Esta ação é temporária e você pode reativá-la fazendo login novamente.";
      cancelText = "Cancelar";
      confirmText = "Desativar";
    }

    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel' },
        { 
          text: confirmText, 
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              await AsyncStorage.removeItem("hasSeenOnboarding");
              router.replace("/(auth)/login");
            } catch (e) {
              console.error("Deactivation error:", e);
            }
          }
        }
      ]
    );
  };

  const getLocalizedTitle = (key) => {
    const lang = t('settings.selectLanguage');
    if (key === 'account') {
      return lang === 'Seleccionar Idioma' ? 'Cuenta' : lang === 'Choisir la langue' ? 'Compte' : lang === 'Definir idioma' ? 'Conta' : 'Account';
    }
    if (key === 'notifications') {
      return lang === 'Seleccionar Idioma' ? 'Notificaciones' : lang === 'Choisir la langue' ? 'Notifications' : lang === 'Definir idioma' ? 'Notificações' : 'Notifications';
    }
    if (key === 'preferences') {
      return lang === 'Seleccionar Idioma' ? 'Preferencias' : lang === 'Choisir la langue' ? 'Préférences' : lang === 'Definir idioma' ? 'Preferências' : 'Preferences';
    }
    if (key === 'support') {
      return lang === 'Seleccionar Idioma' ? 'Soporte y Legal' : lang === 'Choisir la langue' ? 'Support & Légal' : lang === 'Definir idioma' ? 'Suporte & Legal' : 'Support & Legal';
    }
    if (key === 'title') {
      return lang === 'Seleccionar Idioma' ? 'Ajustes' : lang === 'Choisir la langue' ? 'Paramètres' : lang === 'Definir idioma' ? 'Configurações' : 'Settings';
    }
  };

  const getRowLabel = (key) => {
    const lang = t('settings.selectLanguage');
    switch (key) {
      case 'changePassword':
        return lang === 'Seleccionar Idioma' ? 'Cambiar contraseña' : lang === 'Choisir la langue' ? 'Changer le mot de passe' : lang === 'Definir idioma' ? 'Alterar senha' : 'Change Password';
      case 'deactivate':
        return lang === 'Seleccionar Idioma' ? 'Desactivar cuenta' : lang === 'Choisir la langue' ? 'Désactiver le compte' : lang === 'Definir idioma' ? 'Desativar conta' : 'Deactivate Account';
      case 'messages':
        return lang === 'Seleccionar Idioma' ? 'Mensajes directos' : lang === 'Choisir la langue' ? 'Messages directs' : lang === 'Definir idioma' ? 'Mensagens diretas' : 'Direct Messages';
      case 'likesComments':
        return lang === 'Seleccionar Idioma' ? 'Me gusta y comentarios' : lang === 'Choisir la langue' ? 'J\'aime & commentaires' : lang === 'Definir idioma' ? 'Curtidas & Comentários' : 'Likes & Comments';
      case 'connectionRequests':
        return lang === 'Seleccionar Idioma' ? 'Solicitudes de conexión' : lang === 'Choisir la langue' ? 'Demandes de connexion' : lang === 'Definir idioma' ? 'Solicitações de conexão' : 'Connection Requests';
      case 'language':
        return lang === 'Seleccionar Idioma' ? 'Idioma de la aplicación' : lang === 'Choisir la langue' ? 'Langue de l\'application' : lang === 'Definir idioma' ? 'Idioma do aplicativo' : 'App Language';
      case 'privacyPolicy':
        return lang === 'Seleccionar Idioma' ? 'Política de privacidad' : lang === 'Choisir la langue' ? 'Politique de confidentialité' : lang === 'Definir idioma' ? 'Política de Privacidade' : 'Privacy Policy';
      default: return '';
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
        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('account')}</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row}
              onPress={() => router.push("/(auth)/forgotpassword")}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="key-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('changePassword')}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.row}
              onPress={handleDeactivate}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={[styles.rowLabel, { color: '#EF4444' }]}>{getRowLabel('deactivate')}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('notifications')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('messages')}</Text>
              </View>
              <Switch 
                value={notifyMessages}
                onValueChange={toggleMessages}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={notifyMessages ? '#438def' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="heart-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('likesComments')}</Text>
              </View>
              <Switch 
                value={notifyLikesComments}
                onValueChange={toggleLikesComments}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={notifyLikesComments ? '#438def' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="person-add-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('connectionRequests')}</Text>
              </View>
              <Switch 
                value={notifyConnections}
                onValueChange={toggleConnections}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={notifyConnections ? '#438def' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('preferences')}</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row}
              onPress={() => setIsLanguageModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="globe-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('language')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowValue}>{getLanguageName()}</Text>
                <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SUPPORT & LEGAL SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLocalizedTitle('support')}</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row}
              onPress={handleShowAbout}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="information-circle-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{t('settings.aboutUs')}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.row}
              onPress={handleShowPrivacy}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#438def" />
                <Text style={styles.rowLabel}>{getRowLabel('privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      <LanguageSelectorModal 
        visible={isLanguageModalVisible} 
        onClose={() => setIsLanguageModalVisible(false)} 
      />
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
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  rowLabel: {
    fontSize: scale(15),
    fontFamily: TYPOGRAPHY.medium,
    color: '#1F2937',
  },
  rowValue: {
    fontSize: scale(14),
    fontFamily: TYPOGRAPHY.regular,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: scale(16),
  },
});
