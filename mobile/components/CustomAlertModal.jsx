import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import createResponsiveStyleSheet from '../utils/responsiveStyleSheet';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { registerAlertCallback } from '../utils/alertManager';


const CustomAlertModal = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [options, setOptions] = useState(null);

  const getTranslatedButtonText = (text) => {
    if (!text) return '';
    const lower = text.toLowerCase().trim();
    if (lower === 'ok') {
      return t('settings.selectLanguage') === 'Select Language' ? 'OK' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Aceptar' : t('settings.selectLanguage') === 'Choisir la langue' ? 'OK' : 'OK';
    }
    if (lower === 'cancel') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Cancel' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Cancelar' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Annuler' : 'Cancelar';
    }
    if (lower === 'yes') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Yes' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Sí' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Oui' : 'Sim';
    }
    if (lower === 'no') {
      return t('settings.selectLanguage') === 'Select Language' ? 'No' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'No' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Non' : 'Não';
    }
    if (lower === 'delete') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Delete' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Eliminar' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Supprimer' : 'Excluir';
    }
    if (lower === 'success') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Success' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Éxito' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Succès' : 'Sucesso';
    }
    if (lower === 'error') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Error' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Error' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Erreur' : 'Erro';
    }
    return text;
  };

  const translateAlertText = (text) => {
    if (!text) return '';
    const trimText = text.trim();
    
    // Common terms
    if (trimText === 'Error') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Error' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Error' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Erreur' : 'Erro';
    }
    if (trimText === 'Success') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Success' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Éxito' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Succès' : 'Sucesso';
    }
    if (trimText === 'Confirm Delete') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Confirm Delete' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Confirmar eliminación' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Confirmer la suppression' : 'Confirmar exclusão';
    }
    if (trimText === 'Delete Photo') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Delete Photo' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Eliminar foto' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Supprimer la photo' : 'Excluir foto';
    }
    if (trimText === 'Block User') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Block User' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Bloquear usuario' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Bloquer l\'utilisateur' : 'Bloquear usuário';
    }
    if (trimText === 'Request Sent') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Request Sent' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Solicitud enviada' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Demande envoyée' : 'Solicitação enviada';
    }
    if (trimText === 'Groups') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Groups' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Grupos' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Groupes' : 'Grupos';
    }
    if (trimText === 'Privacy') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Privacy' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Privacidad' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Confidentialité' : 'Privacidade';
    }
    if (trimText === 'Search Profile') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Search Profile' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Buscar perfil' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Rechercher un profil' : 'Buscar perfil';
    }
    if (trimText === 'Settings') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Settings' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Ajustes' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Paramètres' : 'Configurações';
    }
    if (trimText === 'About Us') {
      return t('settings.selectLanguage') === 'Select Language' ? 'About Us' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Sobre nosotros' : t('settings.selectLanguage') === 'Choisir la langue' ? 'À propos de nous' : 'Sobre nós';
    }
    if (trimText === 'Story Views') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Story Views' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Vistas de la historia' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Vues de la story' : 'Visualizações da história';
    }
    if (trimText === 'Story Reaction') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Story Reaction' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Reacción a la historia' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Réaction à la story' : 'Reação à história';
    }

    // Common Messages
    if (trimText === 'Failed to select image.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Failed to select image.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Error al seleccionar la imagen.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Échec de la sélection de l\'image.' : 'Falha ao selecionar a imagem.';
    }
    if (trimText === 'Could not accept message request.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Could not accept message request.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'No se pudo aceptar la solicitud de mensaje.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Impossible d\'accepter la demande de message.' : 'Não foi possível aceitar a solicitação de mensagem.';
    }
    if (trimText === 'Are you sure you want to delete this connection request?') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Are you sure you want to delete this connection request?' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¿Estás seguro de que quieres eliminar esta solicitud de conexión?' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Êtes-vous sûr de vouloir supprimer cette demande de connexion ?' : 'Tem certeza de que deseja excluir esta solicitação de conexão?';
    }
    if (trimText === 'Could not delete request.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Could not delete request.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'No se pudo eliminar la solicitud.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Impossible de supprimer la demande.' : 'Não foi possível excluir a solicitação.';
    }
    if (trimText === 'Could not open story viewer.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Could not open story viewer.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'No se pudo abrir el visor de historias.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Impossible d\'ouvrir le visionneur de stories.' : 'Não foi possível abrir o visualizador de histórias.';
    }
    if (trimText === 'Failed to update photo. Please try again.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Failed to update photo. Please try again.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Error al actualizar la foto. Inténtalo de nuevo.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Échec de la mise à jour de la photo. Veuillez réessayer.' : 'Falha ao atualizar a foto. Tente novamente.';
    }
    if (trimText === 'Are you sure you want to delete this photo from your folder?') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Are you sure you want to delete this photo from your folder?' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¿Estás seguro de que deseas eliminar esta foto de tu carpeta?' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Êtes-vous sûr de vouloir supprimer cette photo de votre dossier ?' : 'Tem certeza de que deseja excluir esta foto da sua pasta?';
    }
    if (trimText === 'Photo deleted successfully.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Photo deleted successfully.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Foto eliminada con éxito.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Photo supprimée avec succès.' : 'Foto excluída com sucesso.';
    }
    if (trimText === 'Failed to delete photo. Please try again.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Failed to delete photo. Please try again.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Error al eliminar la foto. Inténtalo de nuevo.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Échec de la suppression de la photo. Veuillez réessayer.' : 'Falha ao excluir a foto. Tente novamente.';
    }
    if (trimText === 'Groups feature coming soon.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Groups feature coming soon.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'La función de grupos estará disponible pronto.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Fonctionnalité de groupes à venir bientôt.' : 'Recurso de grupos em breve.';
    }
    if (trimText === 'Privacy options coming soon.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Privacy options coming soon.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Opciones de privacidad disponibles pronto.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Options de confidentialité à venir bientôt.' : 'Opções de privacidade em breve.';
    }
    if (trimText === 'Profile searching is available on the Home tab.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Profile searching is available on the Home tab.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'La búsqueda de perfiles está disponible en la pestaña de inicio.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'La recherche de profil est disponible sur l\'onglet Accueil.' : 'A pesquisa de perfil está disponível na guia Início.';
    }
    if (trimText === 'General settings coming soon.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'General settings coming soon.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Ajustes generales disponibles pronto.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Paramètres généraux à venir bientôt.' : 'Configurações gerais em breve.';
    }
    if (trimText === 'Zyntra is a premium professional networking platform.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Zyntra is a premium professional networking platform.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Zyntra es una plataforma de red profesional premium.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Zyntra est une plateforme de réseau professionnel de premier choix.' : 'Zyntra é uma plataforma premium de networking profissional.';
    }
    if (trimText === 'Could not accept connection request.') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Could not accept connection request.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'No se pudo aceptar la solicitud de conexión.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Impossible d\'accepter la demande de connexion.' : 'Não foi possível aceitar a solicitação de conexão.';
    }
    if (trimText === 'Profile updated successfully!') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Profile updated successfully!' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¡Perfil actualizado con éxito!' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Profil mis à jour avec succès !' : 'Perfil atualizado com sucesso!';
    }
    if (trimText === 'Post updated successfully!') {
      return t('settings.selectLanguage') === 'Select Language' ? 'Post updated successfully!' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¡Publicación actualizada con éxito!' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Message mis à jour avec succès !' : 'Publicação atualizada com sucesso!';
    }

    // Starts with / contains templates
    if (trimText.startsWith('Your profile picture has been updated successfully.')) {
      return t('settings.selectLanguage') === 'Select Language' ? 'Your profile picture has been updated successfully.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Tu foto de perfil se ha actualizado correctamente.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Votre photo de profil a été mise à jour avec succès.' : 'Sua foto de perfil foi atualizada com sucesso.';
    }
    if (trimText.startsWith('Your cover photo has been updated successfully.')) {
      return t('settings.selectLanguage') === 'Select Language' ? 'Your cover photo has been updated successfully.' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Tu foto de portada se ha actualizado correctamente.' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Votre photo de couverture a été mise à jour avec succès.' : 'Sua foto de capa foi atualizada com sucesso.';
    }
    if (trimText.startsWith('You are now connected with')) {
      const name = trimText.replace('You are now connected with', '').replace('!', '').trim();
      return t('settings.selectLanguage') === 'Select Language' ? `You are now connected with ${name}!` : t('settings.selectLanguage') === 'Seleccionar Idioma' ? `¡Ahora estás conectado con ${name}!` : t('settings.selectLanguage') === 'Choisir la langue' ? `Vous êtes maintenant connecté avec ${name} !` : `Agora você está conectado com ${name}!`;
    }
    if (trimText.startsWith('Connection request sent to')) {
      const name = trimText.replace('Connection request sent to', '').replace('!', '').trim();
      return t('settings.selectLanguage') === 'Select Language' ? `Connection request sent to ${name}!` : t('settings.selectLanguage') === 'Seleccionar Idioma' ? `¡Solicitud de conexión enviada a ${name}!` : t('settings.selectLanguage') === 'Choisir la langue' ? `Demande de connexion envoyée à ${name} !` : `Solicitação de conexão enviada para ${name}!`;
    }
    if (trimText.startsWith('Are you sure you want to block')) {
      const name = trimText.replace('Are you sure you want to block', '').replace('?', '').trim();
      return t('settings.selectLanguage') === 'Select Language' ? `Are you sure you want to block ${name}?` : t('settings.selectLanguage') === 'Seleccionar Idioma' ? `¿Estás seguro de que quieres bloquear a ${name}?` : t('settings.selectLanguage') === 'Choisir la langue' ? `Êtes-vous sûr de vouloir bloquer ${name} ?` : `Tem certeza de que deseja bloquear ${name}?`;
    }
    if (trimText.startsWith('Your story received') && trimText.includes('views before it expired.')) {
      const count = trimText.replace('Your story received', '').replace('views before it expired.', '').trim();
      return t('settings.selectLanguage') === 'Select Language' ? `Your story received ${count} views before it expired.` : t('settings.selectLanguage') === 'Seleccionar Idioma' ? `Tu historia recibió ${count} vistas antes de vencer.` : t('settings.selectLanguage') === 'Choisir la langue' ? `Votre story a reçu ${count} vues avant de s'expirer.` : `Sua história recebeu ${count} visualizações antes de expirar.`;
    }
    if (trimText.includes('reacted') && trimText.includes('to your story.')) {
      const match = trimText.match(/(.*) reacted (.*) to your story\./);
      if (match) {
        const senderName = match[1];
        const emoji = match[2];
        return t('settings.selectLanguage') === 'Select Language' ? `${senderName} reacted ${emoji} to your story.` : t('settings.selectLanguage') === 'Seleccionar Idioma' ? `${senderName} reaccionó ${emoji} a tu historia.` : t('settings.selectLanguage') === 'Choisir la langue' ? `${senderName} a réagi ${emoji} à votre story.` : `${senderName} reagiu ${emoji} à sua história.`;
      }
    }

    return text;
  };

  
  // Animation refs
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerAlertCallback(({ title, message, buttons, options }) => {
      setTitle(title || 'Alert');
      setMessage(message || '');
      setButtons(buttons || []);
      setOptions(options || null);
      setVisible(true);

      // Spring entry animation
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        })
      ]).start();
    });
  }, []);

  const handleButtonPress = (onPress) => {
    // Exit animations
    Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
      if (onPress) {
        onPress();
      }
    });
  };

  if (!visible) return null;

  // Determine matching alert context icon and accent color based on title keywords
  let iconName = 'information-circle-outline';
  let iconColor = COLORS.accent;
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message.toLowerCase();

  if (lowerTitle.includes('success') || lowerMessage.includes('successful') || lowerTitle.includes('copied') || lowerMessage.includes('copied')) {
    iconName = 'checkmark-circle-outline';
    iconColor = '#10B981'; // Green
  } else if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('incorrect')) {
    iconName = 'alert-circle-outline';
    iconColor = '#EF4444'; // Red
  } else if (lowerTitle.includes('warning') || lowerTitle.includes('not logged in')) {
    iconName = 'warning-outline';
    iconColor = '#F59E0B'; // Amber
  } else if (lowerTitle.includes('delete') || lowerTitle.includes('remove') || lowerTitle.includes('cancel')) {
    iconName = 'trash-outline';
    iconColor = '#EF4444'; // Red
  } else if (lowerTitle.includes('confirm') || lowerTitle.includes('sure') || lowerTitle.includes('accept')) {
    iconName = 'help-circle-outline';
    iconColor = COLORS.accent;
  }

  // Fallback to OK button if no buttons array is supplied
  const alertButtons = buttons && buttons.length > 0 
    ? buttons 
    : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        // Only allow request close if cancelable option is true or cancel button is found
        const hasCancel = alertButtons.some(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
        if (options?.cancelable || hasCancel) {
          const cancelBtn = alertButtons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
          handleButtonPress(cancelBtn?.onPress);
        }
      }}
    >
      <View style={styles.overlay}>
        {/* Backdrop overlay */}
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]} />

        {/* Modal content dialog wrapper */}
        <Animated.View style={[
          styles.dialog, 
          { 
            opacity: opacityValue,
            transform: [{ scale: scaleValue }] 
          }
        ]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={iconName} size={36} color={iconColor} />
            </View>
            <Text style={styles.title}>{translateAlertText(title)}</Text>
          </View>
          
          <View style={styles.body}>
            <Text style={styles.message}>{translateAlertText(message)}</Text>
          </View>

          <View style={[
            styles.footer, 
            alertButtons.length > 2 ? styles.footerVertical : styles.footerHorizontal
          ]}>
            {alertButtons.map((btn, index) => {
              const translatedText = getTranslatedButtonText(btn.text);
              const isDestructive = btn.style === 'destructive' || btn.text?.toLowerCase() === 'delete';
              const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';

              let btnBg = COLORS.primary;
              let btnText = '#FFFFFF';
              let btnBorderWidth = 0;
              let btnBorderColor = 'transparent';

              if (isDestructive) {
                btnBg = '#EF4444';
              } else if (isCancel) {
                btnBg = '#F3F4F6';
                btnText = '#4B5563';
                btnBorderWidth = 1;
                btnBorderColor = '#E5E7EB';
              } else if (index === alertButtons.length - 1 && alertButtons.length > 1) {
                btnBg = COLORS.accent;
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={[
                    styles.button,
                    alertButtons.length > 2 ? styles.buttonFullWidth : styles.buttonFlex,
                    { 
                      backgroundColor: btnBg,
                      borderWidth: btnBorderWidth,
                      borderColor: btnBorderColor
                    }
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                >
                  <Text style={[styles.buttonLabel, { color: btnText }]}>
                    {translatedText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = createResponsiveStyleSheet({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 11, 14, 0.45)', // Premium dark overlay color
  },
  dialog: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0A0E1A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.bold,
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  body: {
    marginBottom: 24,
  },
  message: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  footer: {
    gap: 10,
  },
  footerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonLabel: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.semiBold,
  },
});

export default CustomAlertModal;
